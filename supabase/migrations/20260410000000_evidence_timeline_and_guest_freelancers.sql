-- ============================================================
-- Evidence Timeline + No-Account Freelancer + Dispute Proposals
-- ============================================================

-- 1. Guest freelancer fields on deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS guest_freelancer_email text,
  ADD COLUMN IF NOT EXISTS guest_freelancer_name text,
  ADD COLUMN IF NOT EXISTS guest_freelancer_stripe_account_id text,
  ADD COLUMN IF NOT EXISTS guest_email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2. Structured dispute fields
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS category text
    CHECK (category IN (
      'not_delivered', 'wrong_deliverables', 'incomplete_work',
      'quality_mismatch', 'communication_issues', 'other'
    )),
  ADD COLUMN IF NOT EXISTS claimant_proposed_percentage integer
    CHECK (claimant_proposed_percentage >= 0 AND claimant_proposed_percentage <= 100),
  ADD COLUMN IF NOT EXISTS claimant_justification text,
  ADD COLUMN IF NOT EXISTS respondent_proposed_percentage integer
    CHECK (respondent_proposed_percentage >= 0 AND respondent_proposed_percentage <= 100),
  ADD COLUMN IF NOT EXISTS respondent_justification text,
  ADD COLUMN IF NOT EXISTS negotiation_round integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS claimant_round2_percentage integer
    CHECK (claimant_round2_percentage >= 0 AND claimant_round2_percentage <= 100),
  ADD COLUMN IF NOT EXISTS respondent_round2_percentage integer
    CHECK (respondent_round2_percentage >= 0 AND respondent_round2_percentage <= 100),
  ADD COLUMN IF NOT EXISTS evidence_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_resolved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extension_count integer NOT NULL DEFAULT 0;

-- 3. Evidence flag on activity log
ALTER TABLE public.deal_activity_log
  ADD COLUMN IF NOT EXISTS is_submission_evidence boolean NOT NULL DEFAULT false;

-- 4. Guest email verification codes
CREATE TABLE IF NOT EXISTS public.guest_email_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_deals_guest_email
  ON public.deals(guest_freelancer_email)
  WHERE guest_freelancer_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deals_expires_at
  ON public.deals(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guest_verifications_deal_email
  ON public.guest_email_verifications(deal_id, email)
  WHERE verified_at IS NULL;

-- 6. RLS on guest_email_verifications (service role only — no direct client access)
ALTER TABLE public.guest_email_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.guest_email_verifications
  FOR ALL
  USING (false);
