-- ============================================================
-- Deal Moderation System Migration
-- ============================================================

-- 1. Add review_status and moderation columns to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS risk_score integer NOT NULL DEFAULT 0;

-- Backfill: set existing flagged deals to 'pending' instead of 'approved'
UPDATE public.deals
  SET review_status = 'pending'
  WHERE flagged_for_review = true AND review_status = 'approved';

-- 2. Create deal_moderation_log table
CREATE TABLE IF NOT EXISTS public.deal_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL, -- 'approved', 'changes_requested', 'rejected', 'escalated'
  previous_status text,
  new_status text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS on deal_moderation_log
ALTER TABLE public.deal_moderation_log ENABLE ROW LEVEL SECURITY;

-- Admins can read all moderation logs (via service client, so no RLS policy needed for reads)
-- Deal participants can read moderation logs for their own deals
CREATE POLICY "Participants can read moderation logs for own deals"
  ON public.deal_moderation_log
  FOR SELECT
  USING (
    deal_id IN (
      SELECT id FROM public.deals
      WHERE client_user_id = auth.uid() OR freelancer_user_id = auth.uid()
    )
  );

-- Only service role can insert (admin actions go through API with service client)
-- No INSERT policy for authenticated users — all inserts use service client

-- 4. Add index for fast admin queries
CREATE INDEX IF NOT EXISTS idx_deals_review_status ON public.deals(review_status);
CREATE INDEX IF NOT EXISTS idx_deals_risk_score ON public.deals(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_deal_moderation_log_deal_id ON public.deal_moderation_log(deal_id);

-- 5. Add check constraint for valid review_status values
ALTER TABLE public.deals
  ADD CONSTRAINT deals_review_status_check
  CHECK (review_status IN ('pending', 'approved', 'changes_requested', 'rejected'));
