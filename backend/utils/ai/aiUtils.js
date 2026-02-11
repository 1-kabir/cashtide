const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");

// Initialize the LLM based on configuration
const initializeLLM = (options = {}) => {
  // Default configuration
  const config = {
    modelName: process.env.LLM_MODEL_NAME || "gpt-3.5-turbo",
    temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS) || 1000,
    apiKey: process.env.OPENAI_API_KEY, // Using OPENAI_API_KEY for now, but could be extended for other providers
    ...options
  };

  return new ChatOpenAI(config);
};

// Function to create a system message for the AI assistant
const createSystemMessage = (context = {}) => {
  const systemPrompt = `
    You are a financial assistant for CashTide, a personal finance management application. 
    Your role is to help users understand their financial data, provide insights about their spending,
    subscriptions, and free trials. Be helpful, concise, and accurate.
    
    Today's date is ${new Date().toISOString().split('T')[0]}.
    
    User context:
    - User ID: ${context.userId || 'unknown'}
    - User name: ${context.userName || 'User'}
    
    Respond in a friendly, professional manner. Only provide information based on the data provided.
    If you don't have enough information to answer a question, politely say so and suggest the user
    check their CashTide app for more details.
  `;
  
  return new SystemMessage(systemPrompt);
};

// Function to format user financial data for AI consumption
const formatFinancialDataForAI = (financialData) => {
  const { wallets, transactions, subscriptions, freeTrials } = financialData;
  
  return {
    wallets: wallets?.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      primaryCurrency: w.primary_currency,
      totalBalance: calculateWalletBalance(w.id, transactions)
    })) || [],
    
    transactions: transactions?.slice(0, 20).map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      notes: t.notes,
      date: t.date
    })) || [],
    
    subscriptions: subscriptions?.map(s => ({
      id: s.id,
      name: s.name,
      amount: s.amount,
      currency: s.currency,
      interval: s.interval_type,
      startDate: s.start_date,
      endDate: s.end_date,
      status: s.status
    })) || [],
    
    freeTrials: freeTrials?.map(ft => ({
      id: ft.id,
      name: ft.name,
      startDate: ft.start_date,
      endDate: ft.end_date,
      status: ft.status,
      relatedSubscription: ft.related_subscription_name
    })) || []
  };
};

// Helper function to calculate wallet balance
const calculateWalletBalance = (walletId, transactions) => {
  if (!transactions) return 0;
  
  return transactions
    .filter(t => t.wallet_id === walletId)
    .reduce((balance, transaction) => {
      // Assuming expenses are negative and income is positive
      return transaction.type === 'expense' 
        ? balance - parseFloat(transaction.amount) 
        : balance + parseFloat(transaction.amount);
    }, 0);
};

module.exports = {
  initializeLLM,
  createSystemMessage,
  formatFinancialDataForAI,
  calculateWalletBalance
};