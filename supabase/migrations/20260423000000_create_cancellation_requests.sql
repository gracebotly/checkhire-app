-- ================================================================
-- Mutual Cancellation Requests
-- Either party can request to cancel a deal with a proposed refund
-- split. The other party can accept, reject, or escalate to dispute.
-- Auto-escalates to dispute after 72 hours.
-- ================================================================

CREATE TABLE public.cancellation_requests (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id                         uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  requested_by                    uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  requested_by_role               text NOT NULL CHECK (requested_by_role IN ('client', 'freelancer')),

  -- Proposed split (must sum to deal.total_amount, validated in API layer)
  proposed_client_refund_cents    integer NOT NULL CHECK (proposed_client_refund_cents >= 0),
  proposed_freelancer_payout_cents integer NOT NULL CHECK (proposed_freelancer_payout_cents >= 0),

  reason                          text CHECK (char_length(reason) <= 500),

  status                          text NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'accepted', 'rejected', 'escalated')),

  -- Response tracking
  responded_by                    uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  response_reason                 text CHECK (char_length(response_reason) <= 500),
  responded_at                    timestamptz,

  -- If escalated, link to the dispute that was created
  escalated_dispute_id            uuid REFERENCES public.disputes(id) ON DELETE SET NULL,

  -- Auto-escalation timer
  expires_at                      timestamptz NOT NULL,

  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

-- Only one pending request per deal at a time
CREATE UNIQUE INDEX cancellation_requests_one_pending_per_deal
  ON public.cancellation_requests (deal_id)
  WHERE status = 'pending';

-- Lookup by deal
CREATE INDEX cancellation_requests_deal_id_idx
  ON public.cancellation_requests (deal_id);

-- Cron + lazy-fallback query: find pending requests past expiry
CREATE INDEX cancellation_requests_expiry_idx
  ON public.cancellation_requests (expires_at)
  WHERE status = 'pending';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_cancellation_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cancellation_requests_set_updated_at
  BEFORE UPDATE ON public.cancellation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_cancellation_requests_updated_at();

-- ────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal participants can view cancellation requests"
  ON public.cancellation_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = cancellation_requests.deal_id
        AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
    )
  );

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- All writes happen via service client.
