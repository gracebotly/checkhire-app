-- ============================================================================
-- CheckHire Slice 6 — Trust Layer, Reputation, Flagging, Payments Schema
--
-- New tables: employer_reviews, flags, post_hire_checkins
-- Altered tables: employers, job_listings, applications, user_profiles
-- No new extensions needed (pgcrypto already installed in extensions schema)
-- ============================================================================

-- ─── employer_reviews ────────────────────────────────────────────────────────
-- Post-hire check-in responses and general employer feedback from job seekers.
CREATE TABLE IF NOT EXISTS public.employer_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id      UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  job_listing_id   UUID REFERENCES public.job_listings(id) ON DELETE SET NULL,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  heard_back       BOOLEAN NOT NULL DEFAULT false,
  job_was_real     BOOLEAN NOT NULL DEFAULT true,
  got_paid         BOOLEAN,
  rating           INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments         TEXT,
  review_type      TEXT NOT NULL CHECK (review_type IN (
                     'application_experience', 'post_hire_30day', 'post_hire_60day'
                   )),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employer_reviews ENABLE ROW LEVEL SECURITY;

-- Seekers can create their own reviews
CREATE POLICY "Seekers can create own reviews"
  ON public.employer_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Seekers can read their own reviews
CREATE POLICY "Seekers can read own reviews"
  ON public.employer_reviews FOR SELECT
  USING (auth.uid() = user_id);

-- Anyone can read reviews (public employer accountability)
CREATE POLICY "Anyone can read employer reviews"
  ON public.employer_reviews FOR SELECT
  USING (true);

CREATE INDEX idx_employer_reviews_employer ON public.employer_reviews(employer_id);
CREATE INDEX idx_employer_reviews_listing ON public.employer_reviews(job_listing_id);
CREATE INDEX idx_employer_reviews_type ON public.employer_reviews(employer_id, review_type);

-- ─── flags ───────────────────────────────────────────────────────────────────
-- Community flagging: job seekers flag listings, employers flag impersonators,
-- system auto-flags anomalies.
CREATE TABLE IF NOT EXISTS public.flags (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_type    TEXT NOT NULL CHECK (reporter_type IN ('employer', 'applicant', 'system')),
  target_type      TEXT NOT NULL CHECK (target_type IN ('employer', 'listing')),
  target_id        UUID NOT NULL,
  reason           TEXT NOT NULL CHECK (reason IN (
                     'impersonation', 'ghost_job', 'data_harvesting',
                     'sensitive_info_request', 'mlm_suspected', 'predatory_listing',
                     'unresponsive', 'bait_and_switch', 'other'
                   )),
  description      TEXT,
  status           TEXT NOT NULL CHECK (status IN (
                     'pending', 'investigating', 'resolved', 'dismissed'
                   )) DEFAULT 'pending',
  severity_weight  INTEGER NOT NULL DEFAULT 1,
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID REFERENCES auth.users(id)
);

ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;

-- Authenticated users can create flags
CREATE POLICY "Authenticated users can create flags"
  ON public.flags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can read their own submitted flags
CREATE POLICY "Users can read own flags"
  ON public.flags FOR SELECT
  USING (auth.uid() = reporter_id);

-- No client reads of all flags — admin uses service role
-- Service role bypasses RLS, so no explicit policy needed for admin

CREATE INDEX idx_flags_target ON public.flags(target_type, target_id);
CREATE INDEX idx_flags_status_pending ON public.flags(status) WHERE status = 'pending';
CREATE INDEX idx_flags_reporter ON public.flags(reporter_id);
CREATE INDEX idx_flags_velocity ON public.flags(target_id, target_type, created_at DESC);

-- ─── post_hire_checkins ──────────────────────────────────────────────────────
-- Tracks 30-day and 60-day post-hire check-in emails and responses.
CREATE TABLE IF NOT EXISTS public.post_hire_checkins (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  employer_id      UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_type     TEXT NOT NULL CHECK (checkin_type IN ('30day', '60day')),
  sent_at          TIMESTAMPTZ,
  responded_at     TIMESTAMPTZ,
  response_data    JSONB,
  status           TEXT NOT NULL CHECK (status IN (
                     'pending', 'sent', 'responded', 'expired'
                   )) DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(application_id, checkin_type)
);

ALTER TABLE public.post_hire_checkins ENABLE ROW LEVEL SECURITY;

-- Workers can read their own check-ins
CREATE POLICY "Workers can read own checkins"
  ON public.post_hire_checkins FOR SELECT
  USING (auth.uid() = user_id);

-- Workers can update their own check-ins (respond)
CREATE POLICY "Workers can update own checkins"
  ON public.post_hire_checkins FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role inserts check-ins (from API when hire is confirmed)
CREATE POLICY "Service role can insert checkins"
  ON public.post_hire_checkins FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_post_hire_checkins_status ON public.post_hire_checkins(status, sent_at);
CREATE INDEX idx_post_hire_checkins_user ON public.post_hire_checkins(user_id);
CREATE INDEX idx_post_hire_checkins_employer ON public.post_hire_checkins(employer_id);

-- ─── ALTER: employers — add founding employer, Stripe, account status ────────
ALTER TABLE public.employers
  ADD COLUMN IF NOT EXISTS is_founding_employer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_stripe_id TEXT,
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_score_calculated_at TIMESTAMPTZ;

-- Add CHECK constraint for account_status (separate statement for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'employers_account_status_check'
  ) THEN
    ALTER TABLE public.employers
      ADD CONSTRAINT employers_account_status_check
      CHECK (account_status IN ('active', 'restricted', 'suspended', 'banned'));
  END IF;
END $$;

-- ─── ALTER: job_listings — add payment_status ────────────────────────────────
ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'free';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'job_listings_payment_status_check'
  ) THEN
    ALTER TABLE public.job_listings
      ADD CONSTRAINT job_listings_payment_status_check
      CHECK (payment_status IN ('free', 'pending_payment', 'paid'));
  END IF;
END $$;

-- Update status CHECK to include 'pending_payment' as a valid listing status
ALTER TABLE public.job_listings DROP CONSTRAINT IF EXISTS job_listings_status_check;
ALTER TABLE public.job_listings ADD CONSTRAINT job_listings_status_check
  CHECK (status IN (
    'active', 'filled', 'closed', 'expired', 'paused', 'review_pending', 'pending_payment'
  ));

-- ─── ALTER: applications — add hired_at ──────────────────────────────────────
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS hired_at TIMESTAMPTZ;

-- ─── ALTER: user_profiles — add is_platform_admin ────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

-- ─── New indexes for Slice 6 queries ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employers_account_status ON public.employers(account_status);
CREATE INDEX IF NOT EXISTS idx_employers_founding ON public.employers(is_founding_employer) WHERE is_founding_employer = true;
CREATE INDEX IF NOT EXISTS idx_job_listings_payment_status ON public.job_listings(payment_status);
CREATE INDEX IF NOT EXISTS idx_applications_hired ON public.applications(hired_at) WHERE hired_at IS NOT NULL;

-- ─── Mark existing seed employers as founding employers ──────────────────────
-- All 8 existing seed employers get founding status (free listings during beta)
UPDATE public.employers SET is_founding_employer = true WHERE is_founding_employer = false;

-- ─── Mark existing seed listings as free ─────────────────────────────────────
UPDATE public.job_listings SET payment_status = 'free' WHERE payment_status IS NULL;
