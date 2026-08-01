-- ==================== SCHEMA DE BASE DE DONNÉES BOUBA'IA ====================

-- Table: plans (plans d'abonnement)
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'XOF',
  billing_interval VARCHAR(20) DEFAULT 'monthly',
  trial_days INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]',
  limits JSONB DEFAULT '{}',
  stripe_price_id VARCHAR(100),
  popular BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: users (utilisateurs auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_sign_in_at TIMESTAMP
);

-- Table: profiles (profil utilisateur)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  plan_id VARCHAR(50) REFERENCES plans(id),
  subscription_status VARCHAR(50) DEFAULT 'inactive',
  messages_used INTEGER DEFAULT 0,
  messages_limit INTEGER DEFAULT 500,
  onboarding_complete BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: payments (paiements Wave)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) REFERENCES plans(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'XOF',
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
  wave_transaction_id VARCHAR(100),
  wave_qr_code TEXT,
  payment_method VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: subscriptions (souscriptions actives)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) REFERENCES plans(id),
  payment_id UUID REFERENCES payments(id),
  status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: invoices (factures)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'XOF',
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, overdue, cancelled
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: announcements (annonces admin)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'feature', -- feature, promotion, maintenance, payment, event
  target VARCHAR(50) DEFAULT 'all', -- all, free_users, starter_users, business_users, pending_payments
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sent
  sent_at TIMESTAMP,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: admin_settings (paramètres admin)
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name VARCHAR(100) DEFAULT 'Bouba''IA',
  currency VARCHAR(10) DEFAULT 'XOF',
  contact_email VARCHAR(255),
  support_phone VARCHAR(50),
  wave_api_key TEXT,
  stripe_api_key TEXT,
  email_smtp_host VARCHAR(255),
  email_smtp_port INTEGER DEFAULT 587,
  email_smtp_user VARCHAR(255),
  email_smtp_pass TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== DONNÉES DE BASE ====================

-- Plans par défaut
INSERT INTO plans (id, name, description, price, currency, features, limits, popular) VALUES
('free', 'Bouba Free', 'Parfait pour découvrir', 0, 'XOF', 
 '["Chat IA (500 messages/mois)", "Email"]',
 '{"agents": 1, "messages": 500, "storage": "100MB"}',
 false),
('starter', 'Bouba Starter', 'Pour freelances et petites équipes', 6500, 'XOF',
 '["Chat IA (10,000 messages/mois)", "Email", "Contacts"]',
 '{"agents": 3, "messages": 10000, "storage": "1GB"}',
 true),
('business', 'Bouba Business', 'Solution complète pour les entreprises', 19900, 'XOF',
 '["Chat IA (illimité)", "Email", "Contacts", "Calendrier", "Finance avec documents"]',
 '{"agents": 10, "messages": 999999, "storage": "10GB"}',
 false)
ON CONFLICT (id) DO NOTHING;

-- Utilisateur admin par défaut
INSERT INTO users (id, email, email_verified, password_hash, role) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@bouba.ai', true, '$2b$10$YourHashedPasswordHere', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (user_id, first_name, last_name, plan_id, subscription_status, onboarding_complete) VALUES
('11111111-1111-1111-1111-111111111111', 'Admin', 'Bouba', 'business', 'active', true)
ON CONFLICT DO NOTHING;

-- Paramètres admin par défaut
INSERT INTO admin_settings (id, platform_name, contact_email, support_phone) VALUES
('22222222-2222-2222-2222-222222222222', 'Bouba''IA', 'contact@bouba.ai', '+221 77 123 45 67')
ON CONFLICT DO NOTHING;

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_id ON profiles(plan_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ==================== FONCTIONS ====================

-- Fonction pour vérifier si un utilisateur a un paiement valide pour le mois courant
CREATE OR REPLACE FUNCTION check_valid_payment(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan_id VARCHAR;
  has_valid_payment BOOLEAN;
BEGIN
  -- Récupérer le plan de l'utilisateur
  SELECT plan_id INTO user_plan_id 
  FROM profiles 
  WHERE user_id = user_uuid;
  
  -- Si plan gratuit, toujours valide
  IF user_plan_id = 'free' THEN
    RETURN true;
  END IF;
  
  -- Vérifier s'il y a un paiement complété pour le mois courant
  SELECT EXISTS (
    SELECT 1 FROM payments p
    JOIN subscriptions s ON p.id = s.payment_id
    WHERE p.user_id = user_uuid
    AND p.status = 'completed'
    AND s.status = 'active'
    AND s.current_period_start <= CURRENT_TIMESTAMP
    AND s.current_period_end >= CURRENT_TIMESTAMP
  ) INTO has_valid_payment;
  
  RETURN COALESCE(has_valid_payment, false);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON admin_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();