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

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken
};