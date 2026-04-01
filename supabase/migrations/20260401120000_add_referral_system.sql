-- ============================================
-- CheckHire Referral System Migration
-- Adds: 3 columns to user_profiles, 3 new tables
-- ============================================

-- 1. Add referral columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES user_profiles(id);

-- Constraints
ALTER TABLE user_profiles
  ADD CONSTRAINT referral_code_format CHECK (referral_code ~ '^REF-[A-Z0-9]{6}$'),
  ADD CONSTRAINT referral_slug_format CHECK (
    referral_slug IS NULL OR (
      LENGTH(referral_slug) BETWEEN 3 AND 20
      AND referral_slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
    )
  ),
  ADD CONSTRAINT no_self_referral CHECK (referred_by != id);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON user_profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_slug ON user_profiles(referral_slug);
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by ON user_profiles(referred_by);

-- 2. Create referral_earnings table
CREATE TABLE referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES user_profiles(id),
  referred_user_id UUID NOT NULL REFERENCES user_profiles(id),
  deal_id UUID NOT NULL REFERENCES deals(id),
  deal_amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  stripe_fee INTEGER NOT NULL,
  net_platform_revenue INTEGER NOT NULL,
  referral_commission INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'credited' CHECK (status IN ('credited', 'paid_out')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_out_at TIMESTAMPTZ,
  CONSTRAINT positive_amounts CHECK (
    deal_amount > 0 AND platform_fee > 0 AND stripe_fee >= 0
    AND net_platform_revenue >= 0 AND referral_commission >= 0
  )
);

CREATE INDEX idx_referral_earnings_referrer ON referral_earnings(referrer_user_id);
CREATE INDEX idx_referral_earnings_referred ON referral_earnings(referred_user_id);
CREATE INDEX idx_referral_earnings_deal ON referral_earnings(deal_id);
CREATE INDEX idx_referral_earnings_status ON referral_earnings(status);

-- 3. Create referral_payouts table
CREATE TABLE referral_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  amount INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'platform_credit' CHECK (method IN ('platform_credit', 'stripe_transfer', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT positive_payout CHECK (amount >= 2500)
);

CREATE INDEX idx_referral_payouts_user ON referral_payouts(user_id);
CREATE INDEX idx_referral_payouts_status ON referral_payouts(status);

-- 4. Create referral_clicks table
CREATE TABLE referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL,
  referrer_user_id UUID NOT NULL REFERENCES user_profiles(id),
  ip_hash TEXT,
  user_agent TEXT,
  source TEXT,
  converted BOOLEAN NOT NULL DEFAULT FALSE,
  converted_user_id UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_clicks_code ON referral_clicks(referral_code);
CREATE INDEX idx_referral_clicks_referrer ON referral_clicks(referrer_user_id);
CREATE INDEX idx_referral_clicks_created ON referral_clicks(created_at);

-- 5. Enable RLS on all new tables
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: referral_earnings
CREATE POLICY "Users can view own referral earnings"
  ON referral_earnings FOR SELECT
  USING (referrer_user_id = auth.uid());

CREATE POLICY "Service role can insert referral earnings"
  ON referral_earnings FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Admins can view all referral earnings"
  ON referral_earnings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = TRUE)
  );

-- 7. RLS Policies: referral_payouts
CREATE POLICY "Users can view own referral payouts"
  ON referral_payouts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can request referral payouts"
  ON referral_payouts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all referral payouts"
  ON referral_payouts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = TRUE)
  );

CREATE POLICY "Admins can update referral payouts"
  ON referral_payouts FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = TRUE)
  );

-- 8. RLS Policies: referral_clicks (admin/service only)
CREATE POLICY "No user access to referral clicks"
  ON referral_clicks FOR SELECT
  USING (FALSE);

CREATE POLICY "Admins can view all referral clicks"
  ON referral_clicks FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_platform_admin = TRUE)
  );
