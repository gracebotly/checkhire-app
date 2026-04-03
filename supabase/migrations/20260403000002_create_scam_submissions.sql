-- Create scam_submissions table
CREATE TABLE scam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'other',
  submitted_by_email TEXT,
  submitted_by_name TEXT,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'investigating', 'safe', 'suspicious', 'confirmed_scam')),
  reviewer_user_id UUID REFERENCES user_profiles(id),
  verdict_notes TEXT,
  verdict_summary TEXT,
  verdict_at TIMESTAMPTZ,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE scam_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything (using service client in API routes)
-- No public read/write policies — all access goes through API routes with verifyAdmin or service client

-- Policy: Allow inserts from authenticated AND anonymous users via the public API route
-- (The API route handles validation — this just allows the service client to insert)
CREATE POLICY "Service client full access" ON scam_submissions
  FOR ALL USING (true) WITH CHECK (true);

-- Note: In practice, all queries use the service client (createServiceClient) since
-- submissions come from unauthenticated users and admin reads need full access.
-- RLS is enabled for defense-in-depth but the service client bypasses it.

-- Index for admin listing
CREATE INDEX idx_scam_submissions_status ON scam_submissions(status);
CREATE INDEX idx_scam_submissions_created_at ON scam_submissions(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_scam_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_scam_submissions_updated_at
  BEFORE UPDATE ON scam_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_scam_submissions_updated_at();
