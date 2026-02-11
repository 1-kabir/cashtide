const { supabase } = require('../utils/supabaseClient');
const { shareWalletSchema, updateSharedWalletSchema } = require('../validation/sharedWalletValidation');

// Share a wallet with another user
const shareWallet = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = shareWalletSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const walletId = req.params.id;
    const { email, permission_level } = value;
    const userId = req.user.id;

    // Check if the wallet belongs to the current user
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({ error: { message: 'Wallet not found or access denied' } });
    }

    // Find the user to share with by email
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ error: { message: 'User with this email not found' } });
    }

    // Check if wallet is already shared with this user
    const { data: existingShare, error: existingError } = await supabase
      .from('shared_wallets')
      .select('*')
      .eq('wallet_id', walletId)
      .eq('user_id', targetUser.id)
      .single();

    if (existingShare) {
      return res.status(409).json({ error: { message: 'Wallet is already shared with this user' } });
    }

    // Create the shared wallet record
    const { data: newSharedWallet, error: shareError } = await supabase
      .from('shared_wallets')
      .insert([
        {
          wallet_id: walletId,
          user_id: targetUser.id,
          permission_level,
          invited_by: userId,
          accepted: false // Initially not accepted, user needs to accept invitation
        }
      ])
      .select()
      .single();

    if (shareError) {
      return res.status(500).json({ error: { message: shareError.message } });
    }

    res.status(201).json({ 
      message: 'Wallet sharing invitation sent successfully',
      shared_wallet: newSharedWallet 
    });
  } catch (error) {
    console.error('Share wallet error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Update shared wallet permissions
const updateSharedWallet = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updateSharedWalletSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const sharedWalletId = req.params.sharedWalletId;
    const userId = req.user.id;

    // Get the shared wallet to check if the current user is the owner of the wallet
    const { data: sharedWallet, error: fetchError } = await supabase
      .from('shared_wallets')
      .select(`
        *,
        wallets (user_id as wallet_owner_id)
      `)
      .eq('id', sharedWalletId)
      .single();

    if (fetchError || !sharedWallet) {
      return res.status(404).json({ error: { message: 'Shared wallet not found' } });
    }

    // Check if the current user is the owner of the wallet
    if (sharedWallet.wallets.wallet_owner_id !== userId) {
      return res.status(403).json({ error: { message: 'Only wallet owners can update sharing permissions' } });
    }

    // Update the shared wallet permissions
    const { data: updatedSharedWallet, error: updateError } = await supabase
      .from('shared_wallets')
      .update(value)
      .eq('id', sharedWalletId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: { message: updateError.message } });
    }

    res.status(200).json({ 
      message: 'Shared wallet permissions updated successfully',
      shared_wallet: updatedSharedWallet 
    });
  } catch (error) {
    console.error('Update shared wallet error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Accept or decline a wallet sharing invitation
const respondToInvitation = async (req, res) => {
  try {
    const sharedWalletId = req.params.sharedWalletId;
    const { action } = req.body; // 'accept' or 'decline'
    const userId = req.user.id;

    // Get the shared wallet to check if the current user is the invitee
    const { data: sharedWallet, error: fetchError } = await supabase
      .from('shared_wallets')
      .select('*')
      .eq('id', sharedWalletId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !sharedWallet) {
      return res.status(404).json({ error: { message: 'Sharing invitation not found' } });
    }

    if (action !== 'accept' && action !== 'decline') {
      return res.status(400).json({ error: { message: 'Action must be either "accept" or "decline"' } });
    }

    if (action === 'decline') {
      // Delete the invitation
      const { error: deleteError } = await supabase
        .from('shared_wallets')
        .delete()
        .eq('id', sharedWalletId);

      if (deleteError) {
        return res.status(500).json({ error: { message: deleteError.message } });
      }

      res.status(200).json({ message: 'Sharing invitation declined' });
    } else {
      // Accept the invitation
      const { data: updatedSharedWallet, error: updateError } = await supabase
        .from('shared_wallets')
        .update({ accepted: true, accepted_at: new Date().toISOString() })
        .eq('id', sharedWalletId)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({ error: { message: updateError.message } });
      }

      res.status(200).json({ 
        message: 'Sharing invitation accepted',
        shared_wallet: updatedSharedWallet 
      });
    }
  } catch (error) {
    console.error('Respond to invitation error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Remove shared wallet access
const removeSharedWallet = async (req, res) => {
  try {
    const sharedWalletId = req.params.sharedWalletId;
    const userId = req.user.id;

    // Get the shared wallet to check ownership
    const { data: sharedWallet, error: fetchError } = await supabase
      .from('shared_wallets')
      .select(`
        *,
        wallets (user_id as wallet_owner_id)
      `)
      .eq('id', sharedWalletId)
      .single();

    if (fetchError || !sharedWallet) {
      return res.status(404).json({ error: { message: 'Shared wallet not found' } });
    }

    // Check if the current user is the owner of the wallet or the user who has access
    if (sharedWallet.wallets.wallet_owner_id !== userId && sharedWallet.user_id !== userId) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    // If the wallet owner is removing access, allow it
    // If a user is removing their own access, allow it
    const { error: deleteError } = await supabase
      .from('shared_wallets')
      .delete()
      .eq('id', sharedWalletId);

    if (deleteError) {
      return res.status(500).json({ error: { message: deleteError.message } });
    }

    res.status(200).json({ message: 'Shared wallet access removed successfully' });
  } catch (error) {
    console.error('Remove shared wallet error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Get pending invitations for the current user
const getPendingInvitations = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: invitations, error } = await supabase
      .from('shared_wallets')
      .select(`
        *,
        wallets (name, description)
      `)
      .eq('user_id', userId)
      .eq('accepted', false);

    if (error) {
      return res.status(500).json({ error: { message: error.message } });
    }

    res.status(200).json({ invitations });
  } catch (error) {
    console.error('Get pending invitations error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

module.exports = {
  shareWallet,
  updateSharedWallet,
  respondToInvitation,
  removeSharedWallet,
  getPendingInvitations
};