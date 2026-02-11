const { supabase } = require('../utils/supabaseClient');
const { generateToken } = require('../middleware/auth');
const Joi = require('joi');

// Validation schemas
const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().max(100).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

// Signup new user
const signup = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const { email, password, name } = value;

    // Check if user already exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: { message: 'User with this email already exists' } });
    }

    // Sign up user with Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ error: { message: authError.message } });
    }

    // Create user profile in the database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: data.user.id,
          email: data.user.email,
          name: name,
        }
      ])
      .select()
      .single();

    if (profileError) {
      return res.status(500).json({ error: { message: profileError.message } });
    }

    // Create default wallet for the user
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .insert([
        {
          user_id: data.user.id,
          name: 'My Wallet',
          description: 'Default wallet',
          primary_currency: 'USD',
          currencies: ['USD']
        }
      ])
      .select()
      .single();

    if (walletError) {
      console.error('Error creating default wallet:', walletError);
    }

    // Generate JWT token
    const token = generateToken({
      id: data.user.id,
      email: data.user.email
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Login user
const login = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: { message: error.details[0].message } });
    }

    const { email, password } = value;

    // Sign in user with Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ error: { message: authError.message } });
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      return res.status(500).json({ error: { message: profileError.message } });
    }

    // Generate JWT token
    const token = generateToken({
      id: data.user.id,
      email: data.user.email
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(500).json({ error: { message: error.message } });
    }

    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(500).json({ error: { message: error.message } });
    }

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
};

module.exports = {
  signup,
  login,
  getCurrentUser,
  logout
};