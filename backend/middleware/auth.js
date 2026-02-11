const jwt = require('jsonwebtoken');
const { supabase } = require('../utils/supabaseClient');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: { message: 'Access token required' } });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    
    // Verify the user still exists in Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();
      
    if (error || !user) {
      return res.status(401).json({ error: { message: 'Invalid token' } });
    }
    
    next();
  } catch (err) {
    return res.status(403).json({ error: { message: 'Invalid or expired token' } });
  }
};

// Authorization middleware to check if user owns the wallet or has access to it
const authorizeWalletAccess = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const walletId = req.params.id || req.body.wallet_id;

    if (!walletId) {
      return res.status(400).json({ error: { message: 'Wallet ID is required' } });
    }

    // Check if the wallet belongs to the user directly
    let { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (!error && wallet) {
      // User owns the wallet directly
      req.wallet = wallet;
      return next();
    }

    // If not owned directly, check if user has shared access
    const { data: sharedWallet, error: sharedError } = await supabase
      .from('shared_wallets')
      .select(`
        *,
        wallets (*)
      `)
      .eq('wallet_id', walletId)
      .eq('user_id', userId)
      .eq('accepted', true)
      .single();

    if (sharedError || !sharedWallet) {
      return res.status(403).json({ error: { message: 'Access denied to this wallet' } });
    }

    // User has shared access to the wallet
    req.wallet = sharedWallet.wallets;
    req.sharedWalletPermission = sharedWallet.permission_level;
    next();
  } catch (err) {
    console.error('Authorization error:', err);
    return res.status(500).json({ error: { message: 'Authorization check failed' } });
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  authorizeWalletAccess
};