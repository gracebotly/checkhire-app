-- ============================================================================
-- Add partial index on verification_codes for confirm query
-- Applied to Supabase project mlwdypwarvzwqnrvsnak on 2026-03-29
--
-- Optimizes: WHERE employer_id = X AND code_hash = Y AND used_at IS NULL
--
-- This migration has already been applied to the live database.
-- DO NOT run this against the live database — it will fail.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup
ON public.verification_codes (employer_id, code_hash)
WHERE used_at IS NULL;
