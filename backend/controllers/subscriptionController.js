const { supabase } = require('../utils/supabaseClient');
const { createSubscriptionSchema, updateSubscriptionSchema } = require('../validation/subscriptionValidation');

// Get all subscriptions for a wallet
const getWalletSubscriptions = async (req, res) => {
  try {
    const walletId = req.params.id;

    // Check if user has access to the wallet (done by middleware)
    // req.wallet is set by the middleware

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: { message: error.message } });
    }

    res.status(200).json({ subscriptions });
  } catch (error) {
    console.error('Get wallet subscriptions error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Create a new subscription
const createSubscription = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createSubscriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const walletId = req.params.id;

    // Check if user has access to the wallet (done by middleware)
    // req.wallet is set by the middleware
    // Also check permission level if it's a shared wallet
    if (req.sharedWalletPermission && req.sharedWalletPermission === 'read') {
      return res.status(403).json({ error: { message: 'Insufficient permissions to create subscriptions' } });
    }

    const { name, amount, currency, interval_type, start_date, end_date, notes, status } = value;

    // Create the subscription
    const { data: newSubscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert([
        {
          wallet_id: walletId,
          name,
          amount,
          currency,
          interval_type,
          start_date,
          end_date,
          notes: notes || '',
          status: status || 'active'
        }
      ])
      .select()
      .single();

    if (subscriptionError) {
      return res.status(500).json({ error: { message: subscriptionError.message } });
    }

    res.status(201).json({ subscription: newSubscription });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Update subscription by ID
const updateSubscription = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = updateSubscriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const subscriptionId = req.params.subscriptionId;

    // Get the subscription to check ownership
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        wallets (user_id)
      `)
      .eq('id', subscriptionId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: { message: 'Subscription not found' } });
    }

    // Check if the user has access to this subscription
    if (subscription.wallets.user_id !== req.user.id) {
      // Check if it's a shared wallet with write permissions
      const { data: sharedWallet, error: sharedError } = await supabase
        .from('shared_wallets')
        .select('permission_level')
        .eq('wallet_id', subscription.wallet_id)
        .eq('user_id', req.user.id)
        .eq('accepted', true)
        .single();

      if (sharedError || !sharedWallet || sharedWallet.permission_level === 'read') {
        return res.status(403).json({ error: { message: 'Insufficient permissions to update this subscription' } });
      }
    }

    // Update the subscription
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('subscriptions')
      .update(value)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: { message: updateError.message } });
    }

    res.status(200).json({ subscription: updatedSubscription });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Delete subscription by ID
const deleteSubscription = async (req, res) => {
  try {
    const subscriptionId = req.params.subscriptionId;

    // Get the subscription to check ownership
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        wallets (user_id)
      `)
      .eq('id', subscriptionId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: { message: 'Subscription not found' } });
    }

    // Check if the user has access to this subscription
    if (subscription.wallets.user_id !== req.user.id) {
      // Check if it's a shared wallet with write permissions
      const { data: sharedWallet, error: sharedError } = await supabase
        .from('shared_wallets')
        .select('permission_level')
        .eq('wallet_id', subscription.wallet_id)
        .eq('user_id', req.user.id)
        .eq('accepted', true)
        .single();

      if (sharedError || !sharedWallet || sharedWallet.permission_level === 'read') {
        return res.status(403).json({ error: { message: 'Insufficient permissions to delete this subscription' } });
      }
    }

    // Delete the subscription
    const { error: deleteError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (deleteError) {
      return res.status(500).json({ error: { message: deleteError.message } });
    }

    res.status(200).json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

module.exports = {
  getWalletSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription
};