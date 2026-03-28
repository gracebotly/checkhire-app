-- ============================================================================
-- CheckHire — Verification Codes Table
-- Used for domain email verification (6-digit code flow).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.verification_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id  UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  code_hash    TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Only the service role can read/write verification codes (API routes use supabaseAdmin)
CREATE POLICY "Service role only" ON public.verification_codes
  USING (false)
  WITH CHECK (false);

-- Index for lookup by employer + unused codes
CREATE INDEX idx_verification_codes_employer
  ON public.verification_codes(employer_id, used_at)
  WHERE used_at IS NULL;
