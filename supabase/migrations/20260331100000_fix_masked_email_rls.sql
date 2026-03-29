-- Remove the misleading "Service role manages masked pairs" policy.
-- Service role bypasses RLS entirely, so this policy only confuses
-- debugging when the browser client accidentally hits it.
-- The two SELECT policies for employers and candidates remain.
DROP POLICY IF EXISTS "Service role manages masked pairs" ON public.masked_email_pairs;
