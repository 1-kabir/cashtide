const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const { supabase } = require("../../utils/supabaseClient");

// Tool to get user's wallet information
const getWalletsTool = new DynamicStructuredTool({
  name: "get_user_wallets",
  description: "Get all wallets for the current user",
  schema: z.object({
    userId: z.string().describe("The user's ID"),
  }),
  func: async ({ userId }) => {
    try {
      // Get user's own wallets
      const { data: userWallets, error: userWalletsError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId);

      if (userWalletsError) {
        throw new Error(`Error fetching user wallets: ${userWalletsError.message}`);
      }

      // Get wallets shared with the user
      const { data: sharedWalletsData, error: sharedWalletsError } = await supabase
        .from('shared_wallets')
        .select(`
          permission_level,
          wallets (*)
        `)
        .eq('user_id', userId)
        .eq('accepted', true);

      if (sharedWalletsError) {
        throw new Error(`Error fetching shared wallets: ${sharedWalletsError.message}`);
      }

      // Format shared wallets to match user wallets structure
      const sharedWallets = sharedWalletsData.map(sw => ({
        ...sw.wallets,
        shared: true,
        permission_level: sw.permission_level
      }));

      // Combine user wallets and shared wallets
      const allWallets = [...userWallets, ...sharedWallets];

      return JSON.stringify(allWallets);
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
});

// Tool to get transactions for a specific wallet
const getTransactionsTool = new DynamicStructuredTool({
  name: "get_wallet_transactions",
  description: "Get transactions for a specific wallet",
  schema: z.object({
    walletId: z.string().describe("The wallet ID"),
    limit: z.number().optional().describe("Number of transactions to return (default: 10)"),
  }),
  func: async ({ walletId, limit = 10 }) => {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Error fetching transactions: ${error.message}`);
      }

      return JSON.stringify(transactions);
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
});

// Tool to get subscriptions for a specific wallet
const getSubscriptionsTool = new DynamicStructuredTool({
  name: "get_wallet_subscriptions",
  description: "Get subscriptions for a specific wallet",
  schema: z.object({
    walletId: z.string().describe("The wallet ID"),
  }),
  func: async ({ walletId }) => {
    try {
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Error fetching subscriptions: ${error.message}`);
      }

      return JSON.stringify(subscriptions);
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
});

// Tool to get free trials for a specific wallet
const getFreeTrialsTool = new DynamicStructuredTool({
  name: "get_wallet_free_trials",
  description: "Get free trials for a specific wallet",
  schema: z.object({
    walletId: z.string().describe("The wallet ID"),
  }),
  func: async ({ walletId }) => {
    try {
      const { data: freeTrials, error } = await supabase
        .from('free_trials')
        .select(`
          *,
          subscriptions (name as related_subscription_name)
        `)
        .eq('wallet_id', walletId)
        .order('end_date', { ascending: true });

      if (error) {
        throw new Error(`Error fetching free trials: ${error.message}`);
      }

      return JSON.stringify(freeTrials);
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
});

// Tool to calculate total spending in a specific period
const calculateSpendingTool = new DynamicStructuredTool({
  name: "calculate_spending_period",
  description: "Calculate total spending for a wallet in a specific period",
  schema: z.object({
    walletId: z.string().describe("The wallet ID"),
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z.string().describe("End date in YYYY-MM-DD format"),
  }),
  func: async ({ walletId, startDate, endDate }) => {
    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('wallet_id', walletId)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('type', 'expense'); // Only expenses count as spending

      if (error) {
        throw new Error(`Error calculating spending: ${error.message}`);
      }

      const totalSpending = transactions.reduce((sum, transaction) => {
        return sum + parseFloat(transaction.amount || 0);
      }, 0);

      return JSON.stringify({
        totalSpending,
        startDate,
        endDate,
        transactionCount: transactions.length
      });
    } catch (error) {
      return JSON.stringify({ error: error.message });
    }
  },
});

// Collection of all tools
const aiTools = [
  getWalletsTool,
  getTransactionsTool,
  getSubscriptionsTool,
  getFreeTrialsTool,
  calculateSpendingTool
];

module.exports = {
  aiTools,
  getWalletsTool,
  getTransactionsTool,
  getSubscriptionsTool,
  getFreeTrialsTool,
  calculateSpendingTool
};