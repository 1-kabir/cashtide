const { supabase } = require('../utils/supabaseClient');
const { createFreeTrialSchema, updateFreeTrialSchema } = require('../validation/freeTrialValidation');

// Get all free trials for a wallet
const getWalletFreeTrials = async (req, res) => {
  try {
    const walletId = req.params.id;

    // Check if user has access to the wallet (done by middleware)
    // req.wallet is set by the middleware

    const { data: freeTrials, error } = await supabase
      .from('free_trials')
      .select(`
        *,
        subscriptions (name as related_subscription_name)
      `)
      .eq('wallet_id', walletId)
      .order('end_date', { ascending: true }); // Order by end date ascending (expiring soon first)

    if (error) {
      return res.status(500).json({ error: { message: error.message } });
    }

    res.status(200).json({ free_trials: freeTrials });
  } catch (error) {
    console.error('Get wallet free trials error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Create a new free trial
const createFreeTrial = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createFreeTrialSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const walletId = req.params.id;

    // Check if user has access to the wallet (done by middleware)
    // req.wallet is set by the middleware
    // Also check permission level if it's a shared wallet
    if (req.sharedWalletPermission && req.sharedWalletPermission === 'read') {
      return res.status(403).json({ error: { message: 'Insufficient permissions to create free trials' } });
    }

    const { name, start_date, end_date, notes, related_subscription_id } = value;

    // Create the free trial
    const { data: newFreeTrial, error: freeTrialError } = await supabase
      .from('free_trials')
      .insert([
        {
          wallet_id: walletId,
          name,
          start_date,
          end_date,
          notes: notes || '',
          related_subscription_id
        }
      ])
      .select()
      .single();

    if (freeTrialError) {
      return res.status(500).json({ error: { message: freeTrialError.message } });
    }

    res.status(201).json({ free_trial: newFreeTrial });
  } catch (error) {
    console.error('Create free trial error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Update free trial by ID
const updateFreeTrial = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updateFreeTrialSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const freeTrialId = req.params.freeTrialId;

    // Get the free trial to check ownership
    const { data: freeTrial, error: fetchError } = await supabase
      .from('free_trials')
      .select(`
        *,
        wallets (user_id)
      `)
      .eq('id', freeTrialId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: { message: 'Free trial not found' } });
    }

    // Check if the user has access to this free trial
    if (freeTrial.wallets.user_id !== req.user.id) {
      // Check if it's a shared wallet with write permissions
      const { data: sharedWallet, error: sharedError } = await supabase
        .from('shared_wallets')
        .select('permission_level')
        .eq('wallet_id', freeTrial.wallet_id)
        .eq('user_id', req.user.id)
        .eq('accepted', true)
        .single();

      if (sharedError || !sharedWallet || sharedWallet.permission_level === 'read') {
        return res.status(403).json({ error: { message: 'Insufficient permissions to update this free trial' } });
      }
    }

    // Update the free trial
    const { data: updatedFreeTrial, error: updateError } = await supabase
      .from('free_trials')
      .update(value)
      .eq('id', freeTrialId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: { message: updateError.message } });
    }

    res.status(200).json({ free_trial: updatedFreeTrial });
  } catch (error) {
    console.error('Update free trial error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Delete free trial by ID
const deleteFreeTrial = async (req, res) => {
  try {
    const freeTrialId = req.params.freeTrialId;

    // Get the free trial to check ownership
    const { data: freeTrial, error: fetchError } = await supabase
      .from('free_trials')
      .select(`
        *,
        wallets (user_id)
      `)
      .eq('id', freeTrialId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: { message: 'Free trial not found' } });
    }

    // Check if the user has access to this free trial
    if (freeTrial.wallets.user_id !== req.user.id) {
      // Check if it's a shared wallet with write permissions
      const { data: sharedWallet, error: sharedError } = await supabase
        .from('shared_wallets')
        .select('permission_level')
        .eq('wallet_id', freeTrial.wallet_id)
        .eq('user_id', req.user.id)
        .eq('accepted', true)
        .single();

      if (sharedError || !sharedWallet || sharedWallet.permission_level === 'read') {
        return res.status(403).json({ error: { message: 'Insufficient permissions to delete this free trial' } });
      }
    }

    // Delete the free trial
    const { error: deleteError } = await supabase
      .from('free_trials')
      .delete()
      .eq('id', freeTrialId);

    if (deleteError) {
      return res.status(500).json({ error: { message: deleteError.message } });
    }

    res.status(200).json({ message: 'Free trial deleted successfully' });
  } catch (error) {
    console.error('Delete free trial error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

module.exports = {
  getWalletFreeTrials,
  createFreeTrial,
  updateFreeTrial,
  deleteFreeTrial
};