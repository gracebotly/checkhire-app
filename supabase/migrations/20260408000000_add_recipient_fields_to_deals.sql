-- Add recipient tracking fields for private deal invites.
-- These power the manual "Send invite" button on the client's deal view.
-- Captured at deal creation, fired when the client clicks the button.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_invited_at timestamptz;

-- recipient_email and recipient_name are nullable — clients can create
-- a private deal without specifying a recipient and share the link manually.
-- recipient_invited_at is null until the client clicks "Send invite".

COMMENT ON COLUMN public.deals.recipient_email IS
  'Optional email of the freelancer the client wants to invite. Stored at creation, used by manual /send-invite endpoint.';
COMMENT ON COLUMN public.deals.recipient_name IS
  'Optional display name of the recipient, used in the invite email greeting.';
COMMENT ON COLUMN public.deals.recipient_invited_at IS
  'Set when the client manually fires the invite email. Null = never sent. Updated on resend.';
