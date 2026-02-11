const { supabase } = require('../utils/supabaseClient');
const { createWalletSchema, updateWalletSchema } = require('../validation/walletValidation');

// Get all wallets for the current user
const getUserWallets = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's own wallets
    const { data: userWallets, error: userWalletsError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId);

    if (userWalletsError) {
      return res.status(500).json({ error: { message: userWalletsError.message } });
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
      return res.status(500).json({ error: { message: sharedWalletsError.message } });
    }

    // Format shared wallets to match user wallets structure
    const sharedWallets = sharedWalletsData.map(sw => ({
      ...sw.wallets,
      shared: true,
      permission_level: sw.permission_level
    }));

    // Combine user wallets and shared wallets
    const allWallets = [...userWallets, ...sharedWallets];

    res.status(200).json({ wallets: allWallets });
  } catch (error) {
    console.error('Get user wallets error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Create a new wallet
const createWallet = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createWalletSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const { name, description, primary_currency, currencies } = value;
    const userId = req.user.id;

    // Create the wallet
    const { data: newWallet, error: walletError } = await supabase
      .from('wallets')
      .insert([
        {
          user_id: userId,
          name,
          description: description || '',
          primary_currency,
          currencies: currencies || [primary_currency]
        }
      ])
      .select()
      .single();

    if (walletError) {
      return res.status(500).json({ error: { message: walletError.message } });
    }

    res.status(201).json({ wallet: newWallet });
  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Get wallet by ID
const getWalletById = async (req, res) => {
  try {
    const walletId = req.params.id;
    const userId = req.user.id;

    // Check if the wallet belongs to the user or if it's shared with them
    let { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (error) {
      // Check if it's a shared wallet
      const { data: sharedWallet, error: sharedError } = await supabase
        .from('shared_wallets')
        .select(`
          permission_level,
          wallets (*)
        `)
        .eq('wallet_id', walletId)
        .eq('user_id', userId)
        .eq('accepted', true)
        .single();

      if (sharedError || !sharedWallet) {
        return res.status(404).json({ error: { message: 'Wallet not found or access denied' } });
      }

      // Return the wallet with permission info
      return res.status(200).json({ 
        wallet: {
          ...sharedWallet.wallets,
          shared: true,
          permission_level: sharedWallet.permission_level
        }
      });
    }

    res.status(200).json({ wallet });
  } catch (error) {
    console.error('Get wallet by ID error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Update wallet by ID
const updateWallet = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updateWalletSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const walletId = req.params.id;
    const userId = req.user.id;

    // Check if the wallet belongs to the user
    const { data: wallet, error: fetchError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: { message: 'Wallet not found or access denied' } });
    }

    // Update the wallet
    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallets')
      .update(value)
      .eq('id', walletId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: { message: updateError.message } });
    }

    res.status(200).json({ wallet: updatedWallet });
  } catch (error) {
    console.error('Update wallet error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Delete wallet by ID
const deleteWallet = async (req, res) => {
  try {
    const walletId = req.params.id;
    const userId = req.user.id;

    // Check if the wallet belongs to the user
    const { data: wallet, error: fetchError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: { message: 'Wallet not found or access denied' } });
    }

    // Delete the wallet (this will cascade delete related transactions, subscriptions, etc.)
    const { error: deleteError } = await supabase
      .from('wallets')
      .delete()
      .eq('id', walletId);

    if (deleteError) {
      return res.status(500).json({ error: { message: deleteError.message } });
    }

    res.status(200).json({ message: 'Wallet deleted successfully' });
  } catch (error) {
    console.error('Delete wallet error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

module.exports = {
  getUserWallets,
  createWallet,
  getWalletById,
  updateWallet,
  deleteWallet
};