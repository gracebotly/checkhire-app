-- ============================================================================
-- CheckHire Core Schema — Slice 1
-- Applied to Supabase project mlwdypwarvzwqnrvsnak on 2026-03-28
-- 
-- Tables: user_profiles, employers, employer_users, job_listings,
--         screening_questions, blocked_companies, mlm_indicator_keywords
-- ============================================================================

-- This migration has already been applied to the live database.
-- It is committed here for version control and documentation.
-- DO NOT run this against the live database — it will fail.

-- ─── user_profiles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  user_type  TEXT NOT NULL CHECK (user_type IN ('employer', 'job_seeker')) DEFAULT 'job_seeker',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Service role can insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (true);

-- ─── employers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employers (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name                TEXT NOT NULL,
  website_domain              TEXT,
  verified_domain             BOOLEAN NOT NULL DEFAULT false,
  claimed_by                  UUID REFERENCES auth.users(id),
  tier_level                  INTEGER NOT NULL CHECK (tier_level IN (1, 2, 3)) DEFAULT 3,
  transparency_score          NUMERIC(3,1) NOT NULL DEFAULT 0,
  logo_url                    TEXT,
  description                 TEXT,
  industry                    TEXT,
  company_size                TEXT,
  country                     TEXT NOT NULL DEFAULT 'US',
  stripe_connect_account_id   TEXT,
  identity_verified           BOOLEAN NOT NULL DEFAULT false,
  video_url                   TEXT,
  linkedin_verified           BOOLEAN NOT NULL DEFAULT false,
  linkedin_verified_at        TIMESTAMPTZ,
  linkedin_profile_url        TEXT,
  outreach_status             TEXT CHECK (outreach_status IN ('pending', 'confirmed', 'fraud')),
  outreach_confirmed_at       TIMESTAMPTZ,
  domain_email_verified_at    TIMESTAMPTZ,
  domain_crossref_verified_at TIMESTAMPTZ,
  subscription_type           TEXT CHECK (subscription_type IN ('per_listing', 'unlimited')) DEFAULT 'per_listing',
  subscription_active         BOOLEAN NOT NULL DEFAULT false,
  verification_card_public    BOOLEAN NOT NULL DEFAULT true,
  slug                        TEXT UNIQUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view employer profiles" ON public.employers FOR SELECT USING (true);
CREATE POLICY "Employer admins can update own company" ON public.employers FOR UPDATE USING (claimed_by = auth.uid());
CREATE POLICY "Service role can insert employers" ON public.employers FOR INSERT WITH CHECK (true);

-- ─── employer_users ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employer_users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id       UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('admin', 'poster')) DEFAULT 'poster',
  invited_by        UUID REFERENCES auth.users(id),
  linkedin_profile_url TEXT,
  identity_verified BOOLEAN NOT NULL DEFAULT false,
  video_url         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employer_id, user_id)
);

ALTER TABLE public.employer_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employer users can read own company team" ON public.employer_users FOR SELECT
  USING (employer_id IN (SELECT eu.employer_id FROM public.employer_users eu WHERE eu.user_id = auth.uid()));
CREATE POLICY "Service role can insert employer_users" ON public.employer_users FOR INSERT WITH CHECK (true);

-- ─── job_listings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_listings (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id                UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  posted_by                  UUID REFERENCES public.employer_users(id),
  title                      TEXT NOT NULL,
  description                TEXT NOT NULL,
  job_type                   TEXT NOT NULL CHECK (job_type IN ('gig', 'temp', 'full_time', 'part_time', 'contract')),
  category                   TEXT,
  salary_min                 INTEGER,
  salary_max                 INTEGER,
  pay_type                   TEXT NOT NULL CHECK (pay_type IN ('hourly', 'salary', 'project', 'commission')),
  commission_structure       JSONB,
  ote_min                    INTEGER,
  ote_max                    INTEGER,
  is_100_percent_commission  BOOLEAN NOT NULL DEFAULT false,
  remote_type                TEXT NOT NULL CHECK (remote_type IN ('full_remote', 'hybrid', 'onsite')),
  location_city              TEXT,
  location_state             TEXT,
  location_country           TEXT NOT NULL DEFAULT 'US',
  timezone_requirements      TEXT,
  equipment_policy           TEXT,
  respond_by_date            DATE,
  fill_by_date               DATE,
  status                     TEXT NOT NULL CHECK (status IN ('active', 'filled', 'closed', 'expired', 'paused', 'review_pending')) DEFAULT 'active',
  close_reason               TEXT,
  escrow_status              TEXT NOT NULL CHECK (escrow_status IN ('not_applicable', 'pending_funding', 'funded', 'released', 'refunded')) DEFAULT 'not_applicable',
  requires_video_application BOOLEAN NOT NULL DEFAULT false,
  requires_screening_quiz    BOOLEAN NOT NULL DEFAULT false,
  max_applications           INTEGER NOT NULL DEFAULT 100,
  current_application_count  INTEGER NOT NULL DEFAULT 0,
  mlm_flag_score             INTEGER NOT NULL DEFAULT 0,
  slug                       TEXT UNIQUE NOT NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at                 TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '45 days'),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active listings" ON public.job_listings FOR SELECT USING (status = 'active');
CREATE POLICY "Employers can view own listings" ON public.job_listings FOR SELECT
  USING (employer_id IN (SELECT eu.employer_id FROM public.employer_users eu WHERE eu.user_id = auth.uid()));
CREATE POLICY "Employers can create listings" ON public.job_listings FOR INSERT
  WITH CHECK (employer_id IN (SELECT eu.employer_id FROM public.employer_users eu WHERE eu.user_id = auth.uid()));
CREATE POLICY "Employers can update own listings" ON public.job_listings FOR UPDATE
  USING (employer_id IN (SELECT eu.employer_id FROM public.employer_users eu WHERE eu.user_id = auth.uid()));

CREATE INDEX idx_job_listings_status_created ON public.job_listings(status, created_at DESC);
CREATE INDEX idx_job_listings_slug ON public.job_listings(slug);
CREATE INDEX idx_job_listings_employer ON public.job_listings(employer_id);
CREATE INDEX idx_job_listings_category ON public.job_listings(category);
CREATE INDEX idx_job_listings_job_type ON public.job_listings(job_type);
CREATE INDEX idx_job_listings_remote_type ON public.job_listings(remote_type);
CREATE INDEX idx_job_listings_pay_type ON public.job_listings(pay_type);

-- ─── screening_questions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.screening_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_listing_id  UUID NOT NULL REFERENCES public.job_listings(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'yes_no', 'numerical')),
  options         JSONB,
  required        BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.screening_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view screening questions for active listings" ON public.screening_questions FOR SELECT
  USING (job_listing_id IN (SELECT jl.id FROM public.job_listings jl WHERE jl.status = 'active'));
CREATE POLICY "Employers can manage own screening questions" ON public.screening_questions FOR ALL
  USING (job_listing_id IN (SELECT jl.id FROM public.job_listings jl
    WHERE jl.employer_id IN (SELECT eu.employer_id FROM public.employer_users eu WHERE eu.user_id = auth.uid())));

-- ─── blocked_companies ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blocked_companies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name   TEXT NOT NULL,
  website_domain TEXT,
  reason         TEXT NOT NULL CHECK (reason IN ('mlm', 'fraud', 'data_harvesting', 'repeated_violations')),
  added_by       UUID,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blocked_companies ENABLE ROW LEVEL SECURITY;

-- ─── mlm_indicator_keywords ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mlm_indicator_keywords (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_phrase  TEXT NOT NULL,
  weight          INTEGER NOT NULL DEFAULT 1,
  category        TEXT NOT NULL CHECK (category IN ('recruitment_language', 'income_claims', 'startup_costs', 'structure_indicators')),
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mlm_indicator_keywords ENABLE ROW LEVEL SECURITY;

-- ─── Triggers ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_user_profiles BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_employers BEFORE UPDATE ON public.employers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_job_listings BEFORE UPDATE ON public.job_listings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
