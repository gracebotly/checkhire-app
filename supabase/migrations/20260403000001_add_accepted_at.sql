-- Add accepted_at timestamp to deals table
-- Records when a freelancer (registered or guest) accepted the gig
-- Used for the 24-hour grace period lock on client cancellations
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- Backfill accepted_at for deals that already have a freelancer
-- Uses the deal's updated_at as a best-effort approximation
UPDATE public.deals
  SET accepted_at = updated_at
  WHERE (freelancer_user_id IS NOT NULL OR guest_freelancer_email IS NOT NULL)
    AND accepted_at IS NULL;
