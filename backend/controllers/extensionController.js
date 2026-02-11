const { initializeLLM } = require('../utils/ai/aiUtils');
const { extensionProcessingSystemPrompt, extensionAnalysisPrompt } = require('../utils/ai/prompts');
const { getLLMConfig } = require('../utils/ai/llmConfig');
const { supabase } = require('../utils/supabaseClient');

// Process captured page content from Chrome extension
const processExtensionCapture = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pageContent, pageUrl, walletId } = req.body;

    if (!pageContent) {
      return res.status(400).json({ error: { message: 'Page content is required' } });
    }

    if (!pageUrl) {
      return res.status(400).json({ error: { message: 'Page URL is required' } });
    }

    // If no walletId is provided, try to find the user's default wallet
    let targetWalletId = walletId;
    if (!targetWalletId) {
      const { data: defaultWallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (walletError || !defaultWallet) {
        return res.status(404).json({ error: { message: 'No wallet found for user and no wallet ID provided' } });
      }

      targetWalletId = defaultWallet.id;
    } else {
      // Verify the user has access to the specified wallet
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('id')
        .eq('id', targetWalletId)
        .eq('user_id', userId)
        .single();

      if (walletError) {
        // Check if it's a shared wallet
        const { data: sharedWallet, error: sharedError } = await supabase
          .from('shared_wallets')
          .select('wallet_id')
          .eq('wallet_id', targetWalletId)
          .eq('user_id', userId)
          .eq('accepted', true)
          .single();

        if (sharedError || !sharedWallet) {
          return res.status(403).json({ error: { message: 'Access denied to specified wallet' } });
        }
      }
    }

    // Get LLM configuration for extension processing
    const llmConfig = getLLMConfig('extension');
    const llm = initializeLLM(llmConfig);

    // Prepare the prompt with the page content
    const prompt = extensionAnalysisPrompt
      .replace('{pageUrl}', pageUrl)
      .replace('{pageContent}', pageContent.substring(0, 4000)); // Limit content length

    // Create a simple chain to process the content
    const { StringOutputParser } = require("@langchain/core/output_parsers");
    const { ChatPromptTemplate } = require("@langchain/core/prompts");

    const systemMessage = extensionProcessingSystemPrompt;
    const chatPrompt = ChatPromptTemplate.fromMessages([
      ["system", systemMessage],
      ["human", prompt]
    ]);

    const parser = new StringOutputParser();

    const chain = chatPrompt.pipe(llm).pipe(parser);

    // Execute the chain
    const result = await chain.invoke({});

    // Attempt to parse the result as JSON
    let parsedResult;
    try {
      // Extract JSON from the response if it's wrapped in markdown code blocks
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : result.trim();
      parsedResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Error parsing AI result:', parseError);
      console.log('Raw result:', result);
      return res.status(500).json({ 
        error: { 
          message: 'Error parsing AI response',
          details: parseError.message
        } 
      });
    }

    // Create a temporary record of the extraction for user review
    const { data: extractionRecord, error: recordError } = await supabase
      .from('ai_intentions')
      .insert([
        {
          user_id: userId,
          wallet_id: targetWalletId,
          intent_type: 'extension_extraction',
          status: 'pending',
          data: {
            original_content: pageContent.substring(0, 1000), // Store first 1000 chars
            extracted_data: parsedResult,
            page_url: pageUrl,
            extraction_timestamp: new Date().toISOString()
          }
        }
      ])
      .select()
      .single();

    if (recordError) {
      console.error('Error creating extraction record:', recordError);
      return res.status(500).json({ error: { message: 'Error saving extraction record' } });
    }

    res.status(200).json({
      extractionId: extractionRecord.id,
      extractedData: parsedResult,
      walletId: targetWalletId,
      status: 'success'
    });
  } catch (error) {
    console.error('Extension capture processing error:', error);
    res.status(500).json({ error: { message: 'Internal server error during extension processing' } });
  }
};

// Get processing status for an extraction
const getExtensionStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { extractionId } = req.params;

    if (!extractionId) {
      return res.status(400).json({ error: { message: 'Extraction ID is required' } });
    }

    const { data: extraction, error } = await supabase
      .from('ai_intentions')
      .select('*')
      .eq('id', extractionId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: { message: 'Extraction record not found' } });
    }

    res.status(200).json({
      extractionId: extraction.id,
      status: extraction.status,
      extractedData: extraction.data.extracted_data,
      walletId: extraction.wallet_id,
      createdAt: extraction.created_at
    });
  } catch (error) {
    console.error('Get extension status error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Confirm extracted transactions and save them to the user's wallet
const confirmExtensionExtraction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { extractionId } = req.params;
    const { confirmedData } = req.body;

    if (!extractionId) {
      return res.status(400).json({ error: { message: 'Extraction ID is required' } });
    }

    // Get the extraction record
    const { data: extraction, error: fetchError } = await supabase
      .from('ai_intentions')
      .select('*')
      .eq('id', extractionId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: { message: 'Extraction record not found' } });
    }

    if (extraction.status !== 'pending') {
      return res.status(400).json({ error: { message: 'Extraction already processed' } });
    }

    // Use the confirmed data if provided, otherwise use the original extracted data
    const dataToProcess = confirmedData || extraction.data.extracted_data;

    // Validate the data structure
    if (!dataToProcess.transactions || !Array.isArray(dataToProcess.transactions)) {
      return res.status(400).json({ error: { message: 'Invalid transaction data structure' } });
    }

    // Process each transaction in the extracted data
    const processedTransactions = [];
    for (const transaction of dataToProcess.transactions) {
      // Validate transaction structure
      if (!transaction.type || !transaction.name || !transaction.amount) {
        console.warn('Skipping invalid transaction:', transaction);
        continue;
      }

      // Create the transaction in the database
      const { data: newTransaction, error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            wallet_id: extraction.wallet_id,
            type: transaction.type,
            amount: parseFloat(transaction.amount),
            currency: transaction.currency || 'USD', // Default to USD if not specified
            notes: transaction.notes || `${transaction.name} - Extracted from ${extraction.data.page_url}`,
            url_reference: extraction.data.page_url,
            date: transaction.date || new Date().toISOString().split('T')[0] // Use today if no date provided
          }
        ])
        .select()
        .single();

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        // Continue processing other transactions even if one fails
        continue;
      }

      processedTransactions.push(newTransaction);
    }

    // Update the extraction record status to completed
    const { error: updateError } = await supabase
      .from('ai_intentions')
      .update({ 
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', extractionId);

    if (updateError) {
      console.error('Error updating extraction status:', updateError);
      // Still return success since transactions were created
    }

    res.status(200).json({
      message: 'Extraction confirmed and transactions saved successfully',
      extractionId,
      processedTransactions,
      processedCount: processedTransactions.length
    });
  } catch (error) {
    console.error('Confirm extension extraction error:', error);
    res.status(500).json({ error: { message: 'Internal server error during confirmation' } });
  }
};

module.exports = {
  processExtensionCapture,
  getExtensionStatus,
  confirmExtensionExtraction
};