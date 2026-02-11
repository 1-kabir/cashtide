-- CashTide Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  primary_currency VARCHAR(10) DEFAULT 'USD',
  currencies TEXT[] DEFAULT ARRAY['USD']::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'subscription', 'free_trial')),
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  notes TEXT,
  url_reference TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  interval_type VARCHAR(20) NOT NULL CHECK (interval_type IN ('weekly', 'monthly', 'yearly')), -- weekly, monthly, yearly
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Free Trials table
CREATE TABLE IF NOT EXISTS free_trials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted', 'cancelled')),
  notes TEXT,
  related_subscription_id UUID REFERENCES subscriptions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared Wallets table
CREATE TABLE IF NOT EXISTS shared_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL CHECK (permission_level IN ('read', 'write', 'admin')),
  invited_by UUID REFERENCES users(id),
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- AI Intentions table
CREATE TABLE IF NOT EXISTS ai_intentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  intent_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better performance
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_subscriptions_wallet_id ON subscriptions(wallet_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_free_trials_wallet_id ON free_trials(wallet_id);
CREATE INDEX idx_free_trials_status ON free_trials(status);
CREATE INDEX idx_free_trials_end_date ON free_trials(end_date);
CREATE INDEX idx_shared_wallets_wallet_id ON shared_wallets(wallet_id);
CREATE INDEX idx_shared_wallets_user_id ON shared_wallets(user_id);
CREATE INDEX idx_ai_intentions_user_id ON ai_intentions(user_id);
CREATE INDEX idx_ai_intentions_wallet_id ON ai_intentions(wallet_id);
CREATE INDEX idx_ai_intentions_status ON ai_intentions(status);

-- RLS (Row Level Security) setup
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_intentions ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own wallets" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallets" ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallets" ON wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wallets" ON wallets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view transactions in own wallets" ON transactions FOR SELECT USING (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert transactions in own wallets" ON transactions FOR INSERT WITH CHECK (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update transactions in own wallets" ON transactions FOR UPDATE USING (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete transactions in own wallets" ON transactions FOR DELETE USING (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view subscriptions in own wallets" ON subscriptions FOR SELECT USING (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert subscriptions in own wallets" ON subscriptions FOR INSERT WITH CHECK (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update subscriptions in own wallets" ON subscriptions FOR UPDATE USING (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete subscriptions in own wallets" ON subscriptions FOR DELETE USING (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view free trials in own wallets" ON free_trials FOR SELECT USING (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert free trials in own wallets" ON free_trials FOR INSERT WITH CHECK (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update free trials in own wallets" ON free_trials FOR UPDATE USING (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete free trials in own wallets" ON free_trials FOR DELETE USING (
  wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view own shared wallet permissions" ON shared_wallets FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can insert own shared wallet permissions" ON shared_wallets FOR INSERT WITH CHECK (
  auth.uid() = user_id OR invited_by = auth.uid()
);

CREATE POLICY "Users can view ai_intentions for own data" ON ai_intentions FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can insert ai_intentions for own data" ON ai_intentions FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "Users can update ai_intentions for own data" ON ai_intentions FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can delete ai_intentions for own data" ON ai_intentions FOR DELETE USING (
  auth.uid() = user_id
);