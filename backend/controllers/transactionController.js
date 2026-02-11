const { supabase } = require('../utils/supabaseClient');
const { createTransactionSchema, updateTransactionSchema } = require('../validation/transactionValidation');

// Get all transactions for a wallet
const getWalletTransactions = async (req, res) => {
  try {
    const walletId = req.params.id;

    // Check if user has access to the wallet (done by middleware)
    // req.wallet is set by the middleware

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('date', { ascending: false }); // Order by date descending

    if (error) {
      return res.status(500).json({ error: { message: error.message } });
    }

    res.status(200).json({ transactions });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Create a new transaction
const createTransaction = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createTransactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const walletId = req.params.id;

    // Check if user has access to the wallet (done by middleware)
    // req.wallet is set by the middleware
    // Also check permission level if it's a shared wallet
    if (req.sharedWalletPermission && req.sharedWalletPermission === 'read') {
      return res.status(403).json({ error: { message: 'Insufficient permissions to create transactions' } });
    }

    const { type, amount, currency, notes, url_reference, date } = value;

    // Create the transaction
    const { data: newTransaction, error: transactionError } = await supabase
      .from('transactions')
      .insert([
        {
          wallet_id: walletId,
          type,
          amount,
          currency,
          notes: notes || '',
          url_reference: url_reference || '',
          date: date || new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (transactionError) {
      return res.status(500).json({ error: { message: transactionError.message } });
    }

    res.status(201).json({ transaction: newTransaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Get transaction by ID
const getTransactionById = async (req, res) => {
  try {
    const transactionId = req.params.transactionId;

    // Get the transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        wallets (user_id)
      `)
      .eq('id', transactionId)
      .single();

    if (error) {
      return res.status(404).json({ error: { message: 'Transaction not found' } });
    }

    // Check if the user has access to this transaction
    if (transaction.wallets.user_id !== req.user.id) {
      // Check if it's a shared wallet
      const { data: sharedWallet, error: sharedError } = await supabase
        .from('shared_wallets')
        .select('permission_level')
        .eq('wallet_id', transaction.wallet_id)
        .eq('user_id', req.user.id)
        .eq('accepted', true)
        .single();

      if (sharedError || !sharedWallet) {
        return res.status(403).json({ error: { message: 'Access denied to this transaction' } });
      }
    }

    res.status(200).json({ transaction });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Update transaction by ID
const updateTransaction = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updateTransactionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const transactionId = req.params.transactionId;

    // Get the transaction to check ownership
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        *,
        wallets (user_id)
      `)
      .eq('id', transactionId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: { message: 'Transaction not found' } });
    }

    // Check if the user has access to this transaction
    if (transaction.wallets.user_id !== req.user.id) {
      // Check if it's a shared wallet with write permissions
      const { data: sharedWallet, error: sharedError } = await supabase
        .from('shared_wallets')
        .select('permission_level')
        .eq('wallet_id', transaction.wallet_id)
        .eq('user_id', req.user.id)
        .eq('accepted', true)
        .single();

      if (sharedError || !sharedWallet || sharedWallet.permission_level === 'read') {
        return res.status(403).json({ error: { message: 'Insufficient permissions to update this transaction' } });
      }
    }

    // Update the transaction
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update(value)
      .eq('id', transactionId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: { message: updateError.message } });
    }

    res.status(200).json({ transaction: updatedTransaction });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Delete transaction by ID
const deleteTransaction = async (req, res) => {
  try {
    const transactionId = req.params.transactionId;

    // Get the transaction to check ownership
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        *,
        wallets (user_id)
      `)
      .eq('id', transactionId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: { message: 'Transaction not found' } });
    }

    // Check if the user has access to this transaction
    if (transaction.wallets.user_id !== req.user.id) {
      // Check if it's a shared wallet with write permissions
      const { data: sharedWallet, error: sharedError } = await supabase
        .from('shared_wallets')
        .select('permission_level')
        .eq('wallet_id', transaction.wallet_id)
        .eq('user_id', req.user.id)
        .eq('accepted', true)
        .single();

      if (sharedError || !sharedWallet || sharedWallet.permission_level === 'read') {
        return res.status(403).json({ error: { message: 'Insufficient permissions to delete this transaction' } });
      }
    }

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (deleteError) {
      return res.status(500).json({ error: { message: deleteError.message } });
    }

    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

module.exports = {
  getWalletTransactions,
  createTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction
};