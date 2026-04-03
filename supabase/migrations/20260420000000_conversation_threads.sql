-- Phase 1: Add conversation threads to deal_activity_log
-- Each interest entry gets its own scoped conversation thread

-- 1. Add interest_id column to deal_activity_log
ALTER TABLE public.deal_activity_log
  ADD COLUMN interest_id uuid REFERENCES public.deal_interest(id) ON DELETE CASCADE;

-- 2. Add entry_type 'message' for conversation thread messages
-- The existing CHECK constraint needs to be updated
ALTER TABLE public.deal_activity_log
  DROP CONSTRAINT IF EXISTS deal_activity_log_entry_type_check;

ALTER TABLE public.deal_activity_log
  ADD CONSTRAINT deal_activity_log_entry_type_check
  CHECK (entry_type IN ('text', 'file', 'system', 'milestone_note', 'message'));

-- 3. Index for fast thread lookups
CREATE INDEX idx_activity_interest ON public.deal_activity_log(interest_id, created_at)
  WHERE interest_id IS NOT NULL;

-- 4. Add status 'in_conversation' to deal_interest
-- The existing CHECK constraint needs to be updated
ALTER TABLE public.deal_interest
  DROP CONSTRAINT IF EXISTS deal_interest_status_check;

ALTER TABLE public.deal_interest
  ADD CONSTRAINT deal_interest_status_check
  CHECK (status IN ('pending', 'in_conversation', 'accepted', 'rejected', 'withdrawn'));

-- 5. RLS: Applicant can read their own thread messages
CREATE POLICY "Applicant can read own thread"
  ON public.deal_activity_log FOR SELECT
  USING (
    interest_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.deal_interest di
      WHERE di.id = interest_id
      AND di.user_id = auth.uid()
    )
  );

-- 6. RLS: Client can read all threads on their deals
CREATE POLICY "Client can read deal threads"
  ON public.deal_activity_log FOR SELECT
  USING (
    interest_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.deal_interest di
      JOIN public.deals d ON d.id = di.deal_id
      WHERE di.id = interest_id
      AND d.client_user_id = auth.uid()
    )
  );

-- 7. RLS: Applicant can insert messages in their own thread
CREATE POLICY "Applicant can post in own thread"
  ON public.deal_activity_log FOR INSERT
  WITH CHECK (
    interest_id IS NOT NULL
    AND entry_type IN ('message', 'file')
    AND auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.deal_interest di
      WHERE di.id = interest_id
      AND di.user_id = auth.uid()
      AND di.status IN ('pending', 'in_conversation')
    )
  );

-- 8. RLS: Client can insert messages in any thread on their deal
CREATE POLICY "Client can post in deal threads"
  ON public.deal_activity_log FOR INSERT
  WITH CHECK (
    interest_id IS NOT NULL
    AND entry_type IN ('message', 'file')
    AND auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.deal_interest di
      JOIN public.deals d ON d.id = di.deal_id
      WHERE di.id = interest_id
      AND d.client_user_id = auth.uid()
    )
  );
