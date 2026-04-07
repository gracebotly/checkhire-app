-- Add pending_wizard_data column to user_profiles
-- Stores wizard form state (category, title, amount, etc.) during signup
-- so that after email confirmation, /auth/post-login can restore the
-- wizard flow regardless of which browser tab the confirmation link opens in.
--
-- This solves the cross-tab sessionStorage limitation: when a user clicks
-- the confirmation link in Gmail, it opens in a new tab that does not have
-- access to the sessionStorage from the original wizard tab.
--
-- The column is JSONB and nullable. It is set during signup, read once
-- in /auth/post-login, then immediately cleared. It should never contain
-- data for more than a few minutes in normal flows.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS pending_wizard_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.user_profiles.pending_wizard_data IS
  'Temporary storage for gig creation wizard state during email confirmation. Set by /api/auth/signup, read and cleared by /auth/post-login. NULL outside of active signup flows.';

-- Existing RLS policies on user_profiles already restrict reads/writes to
-- the row owner, so no new policy is needed. Do not add one.
