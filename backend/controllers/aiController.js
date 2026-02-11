const { initializeLLM } = require('../utils/ai/aiUtils');
const { createUserMemory, getUserConversationHistory, clearUserConversationHistory, saveMessageToHistory } = require('../utils/ai/memory');
const { aiTools } = require('../utils/ai/tools');
const { aiAssistantSystemPrompt } = require('../utils/ai/prompts');
const { getLLMConfig } = require('../utils/ai/llmConfig');
const { supabase } = require('../utils/supabaseClient');

// Create an AI assistant endpoint
const aiAssistant = async (req, res) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: { message: 'Message is required' } });
    }

    // Get user's financial data to provide context
    const { data: userWallets, error: walletsError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId);

    if (walletsError) {
      return res.status(500).json({ error: { message: walletsError.message } });
    }

    // Get recent transactions for context
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .in('wallet_id', userWallets.map(w => w.id))
      .order('date', { ascending: false })
      .limit(20);

    if (transactionsError) {
      return res.status(500).json({ error: { message: transactionsError.message } });
    }

    // Get subscriptions for context
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .in('wallet_id', userWallets.map(w => w.id));

    if (subsError) {
      return res.status(500).json({ error: { message: subsError.message } });
    }

    // Get free trials for context
    const { data: freeTrials, error: trialsError } = await supabase
      .from('free_trials')
      .select('*')
      .in('wallet_id', userWallets.map(w => w.id));

    if (trialsError) {
      return res.status(500).json({ error: { message: trialsError.message } });
    }

    // Prepare context for the AI
    const context = {
      userId: userId,
      userName: req.user.name || 'User',
      wallets: userWallets,
      transactions: transactions,
      subscriptions: subscriptions,
      freeTrials: freeTrials
    };

    // Get LLM configuration for assistant
    const llmConfig = getLLMConfig('assistant');
    const llm = initializeLLM(llmConfig);

    // Prepare the system message with context
    const currentDate = new Date().toISOString().split('T')[0];
    const systemPrompt = aiAssistantSystemPrompt
      .replace('{currentDate}', currentDate)
      .replace('{userId}', context.userId)
      .replace('{userName}', context.userName);

    // Create a simple chain with tools
    const { ToolCallingAgentExecutor, createOpenAIToolsAgent } = require("langchain/agents");
    const { ChatPromptTemplate } = require("@langchain/core/prompts");
    
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["placeholder", "{chat_history}"],
      ["human", "{input}"],
      ["placeholder", "{agent_scratchpad}"]
    ]);

    const agent = createOpenAIToolsAgent({
      llm,
      tools: aiTools,
      prompt,
    });

    const agentExecutor = new ToolCallingAgentExecutor({
      agent,
      tools: aiTools,
    });

    // Get memory for this user
    const memory = createUserMemory(userId);

    // Get chat history
    const chatHistory = await memory.chatHistory.getMessages();

    // Execute the agent with the user's message
    const result = await agentExecutor.invoke({
      input: message,
      chat_history: chatHistory,
    });

    // Save the conversation to history
    await saveMessageToHistory(userId, message, true); // User message
    await saveMessageToHistory(userId, result.output, false); // AI response

    res.status(200).json({
      response: result.output,
      conversationId: userId // Using userId as conversation identifier
    });
  } catch (error) {
    console.error('AI Assistant error:', error);
    res.status(500).json({ error: { message: 'Internal server error during AI processing' } });
  }
};

// Get conversation history for the AI assistant
const getAiAssistantHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await getUserConversationHistory(userId);

    res.status(200).json({
      conversationId: userId,
      history: history
    });
  } catch (error) {
    console.error('Get AI Assistant history error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Clear conversation history for the AI assistant
const clearAiAssistantHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const success = clearUserConversationHistory(userId);

    if (success) {
      res.status(200).json({ message: 'Conversation history cleared successfully' });
    } else {
      res.status(404).json({ error: { message: 'No conversation history found to clear' } });
    }
  } catch (error) {
    console.error('Clear AI Assistant history error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

module.exports = {
  aiAssistant,
  getAiAssistantHistory,
  clearAiAssistantHistory
};