-- ============================================================
-- CheckHire Escrow Pivot: Clean Slate Migration
-- Drops all old job board tables and creates the new escrow schema.
-- ============================================================

-- ─── STEP 1: Drop old triggers ───
DROP TRIGGER IF EXISTS set_updated_at_employers ON public.employers;
DROP TRIGGER IF EXISTS set_updated_at_interview_schedules ON public.interview_schedules;
DROP TRIGGER IF EXISTS set_updated_at_job_listings ON public.job_listings;
DROP TRIGGER IF EXISTS set_updated_at_seeker_profiles ON public.seeker_profiles;
-- Keep: set_updated_at_user_profiles (user_profiles table is kept)

-- ─── STEP 2: Drop old functions (except handle_updated_at which is reused) ───
DROP FUNCTION IF EXISTS public.assign_pseudonym CASCADE;
DROP FUNCTION IF EXISTS public.check_rate_limit CASCADE;
DROP FUNCTION IF EXISTS public.increment_application_count CASCADE;
DROP FUNCTION IF EXISTS public.rls_auto_enable CASCADE;
-- Keep: handle_updated_at (reused for updated_at triggers on new tables)

-- ─── STEP 3: Drop old tables (order matters for FK dependencies) ───
-- Drop tables that reference others first, then work up the chain.
DROP TABLE IF EXISTS public.communication_logs CASCADE;
DROP TABLE IF EXISTS public.masked_email_pairs CASCADE;
DROP TABLE IF EXISTS public.post_hire_checkins CASCADE;
DROP TABLE IF EXISTS public.employer_reviews CASCADE;
DROP TABLE IF EXISTS public.flags CASCADE;
DROP TABLE IF EXISTS public.rate_limit_events CASCADE;
DROP TABLE IF EXISTS public.interview_schedules CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.access_audit_log CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.screening_questions CASCADE;
DROP TABLE IF EXISTS public.pseudonym_adjectives CASCADE;
DROP TABLE IF EXISTS public.pseudonym_nouns CASCADE;
DROP TABLE IF EXISTS public.seeker_profiles CASCADE;
DROP TABLE IF EXISTS public.verification_codes CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;
DROP TABLE IF EXISTS public.rejection_templates CASCADE;
DROP TABLE IF EXISTS public.question_templates CASCADE;
DROP TABLE IF EXISTS public.blocked_companies CASCADE;
DROP TABLE IF EXISTS public.mlm_indicator_keywords CASCADE;
DROP TABLE IF EXISTS public.job_listings CASCADE;
DROP TABLE IF EXISTS public.employer_users CASCADE;
DROP TABLE IF EXISTS public.employers CASCADE;

-- ─── STEP 4: Modify user_profiles for escrow platform ───
-- Drop old RLS policies on user_profiles
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Remove old columns
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS user_type;

-- Add new columns for escrow platform
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS completed_deals_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trust_badge text NOT NULL DEFAULT 'new'
    CHECK (trust_badge IN ('new', 'trusted', 'established', 'verified')),
  ADD COLUMN IF NOT EXISTS profile_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_connected_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean NOT NULL DEFAULT false;

-- Migrate full_name to display_name for existing user
UPDATE public.user_profiles SET display_name = full_name WHERE display_name IS NULL AND full_name IS NOT NULL;

-- Generate profile_slug from display_name for existing users
UPDATE public.user_profiles
SET profile_slug = lower(replace(coalesce(display_name, 'user'), ' ', '-')) || '-' || substr(id::text, 1, 8)
WHERE profile_slug IS NULL;

-- New RLS policies for user_profiles
CREATE POLICY "Anyone can read user profiles"
  ON public.user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can insert profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (true);

-- ─── STEP 5: Create new escrow tables ───

-- ── deals ──
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  deliverables text,
  total_amount integer NOT NULL CHECK (total_amount >= 1000), -- stored in cents, min $10.00
  currency text NOT NULL DEFAULT 'usd',
  deadline timestamptz,
  deal_type text NOT NULL DEFAULT 'private' CHECK (deal_type IN ('private', 'public')),
  deal_link_slug text UNIQUE NOT NULL,
  category text CHECK (category IN ('design', 'development', 'writing', 'marketing', 'virtual_assistant', 'other')),
  client_user_id uuid NOT NULL REFERENCES auth.users(id),
  freelancer_user_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending_acceptance'
    CHECK (status IN ('draft', 'pending_acceptance', 'funded', 'in_progress',
                      'submitted', 'revision_requested', 'completed',
                      'disputed', 'cancelled', 'refunded')),
  escrow_status text NOT NULL DEFAULT 'unfunded'
    CHECK (escrow_status IN ('unfunded', 'funded', 'partially_released',
                             'fully_released', 'refunded', 'frozen')),
  has_milestones boolean NOT NULL DEFAULT false,
  stripe_payment_intent_id text,
  auto_release_at timestamptz,
  revision_count integer NOT NULL DEFAULT 0,
  template_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  funded_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_deals
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Deal RLS policies
CREATE POLICY "Participants can read own deals"
  ON public.deals FOR SELECT
  USING (auth.uid() = client_user_id OR auth.uid() = freelancer_user_id);

CREATE POLICY "Public deals are readable by authenticated users"
  ON public.deals FOR SELECT
  USING (deal_type = 'public' AND status NOT IN ('draft', 'cancelled'));

CREATE POLICY "Anyone can read deal by slug for acceptance"
  ON public.deals FOR SELECT
  USING (deal_link_slug IS NOT NULL);

CREATE POLICY "Authenticated users can create deals"
  ON public.deals FOR INSERT
  WITH CHECK (auth.uid() = client_user_id);

CREATE POLICY "Participants can update own deals"
  ON public.deals FOR UPDATE
  USING (auth.uid() = client_user_id OR auth.uid() = freelancer_user_id)
  WITH CHECK (auth.uid() = client_user_id OR auth.uid() = freelancer_user_id);

-- Index for deal link lookups
CREATE INDEX idx_deals_slug ON public.deals(deal_link_slug);
CREATE INDEX idx_deals_client ON public.deals(client_user_id);
CREATE INDEX idx_deals_freelancer ON public.deals(freelancer_user_id);
CREATE INDEX idx_deals_status ON public.deals(status);
CREATE INDEX idx_deals_auto_release ON public.deals(auto_release_at) WHERE auto_release_at IS NOT NULL;

-- ── milestones ──
CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  amount integer NOT NULL CHECK (amount >= 100), -- cents, min $1.00
  position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_funding'
    CHECK (status IN ('pending_funding', 'funded', 'in_progress', 'submitted',
                      'revision_requested', 'approved', 'released', 'disputed')),
  stripe_payment_intent_id text,
  auto_release_at timestamptz,
  revision_count integer NOT NULL DEFAULT 0,
  funded_at timestamptz,
  submitted_at timestamptz,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_milestones
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal participants can read milestones"
  ON public.milestones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

CREATE POLICY "Deal participants can insert milestones"
  ON public.milestones FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

CREATE POLICY "Deal participants can update milestones"
  ON public.milestones FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

-- ── milestone_change_proposals ──
CREATE TABLE public.milestone_change_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  proposed_by uuid NOT NULL REFERENCES auth.users(id),
  proposal_type text NOT NULL CHECK (proposal_type IN ('add', 'modify', 'remove')),
  proposed_title text,
  proposed_amount integer,
  proposed_description text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.milestone_change_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal participants can read proposals"
  ON public.milestone_change_proposals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

CREATE POLICY "Deal participants can create proposals"
  ON public.milestone_change_proposals FOR INSERT
  WITH CHECK (auth.uid() = proposed_by AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

CREATE POLICY "Deal participants can update proposals"
  ON public.milestone_change_proposals FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

-- ── deal_activity_log ──
CREATE TABLE public.deal_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  entry_type text NOT NULL DEFAULT 'text'
    CHECK (entry_type IN ('text', 'file', 'system', 'milestone_note')),
  content text,
  file_url text,
  file_name text,
  file_size_bytes integer,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal participants can read activity log"
  ON public.deal_activity_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

CREATE POLICY "Deal participants can insert activity entries"
  ON public.deal_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

CREATE POLICY "System can insert activity entries"
  ON public.deal_activity_log FOR INSERT
  WITH CHECK (user_id IS NULL);

CREATE INDEX idx_activity_deal ON public.deal_activity_log(deal_id, created_at);

-- ── deal_interest (for public deals) ──
CREATE TABLE public.deal_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  pitch_text text NOT NULL CHECK (char_length(pitch_text) >= 20 AND char_length(pitch_text) <= 500),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(deal_id, user_id)
);

ALTER TABLE public.deal_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal client can read all interest"
  ON public.deal_interest FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.client_user_id = auth.uid()
  ));

CREATE POLICY "Users can read own interest"
  ON public.deal_interest FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can submit interest"
  ON public.deal_interest FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.deal_type = 'public'
    AND d.status IN ('pending_acceptance')
    AND d.client_user_id != auth.uid()
  ));

CREATE POLICY "Users can withdraw own interest"
  ON public.deal_interest FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Deal client can update interest status"
  ON public.deal_interest FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id AND d.client_user_id = auth.uid()
  ));

-- ── deal_templates ──
CREATE TABLE public.deal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  template_name text NOT NULL,
  title text NOT NULL,
  description text,
  deliverables text,
  default_amount integer, -- cents
  default_deadline_days integer,
  has_milestones boolean NOT NULL DEFAULT false,
  milestone_templates jsonb DEFAULT '[]'::jsonb,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at_deal_templates
  BEFORE UPDATE ON public.deal_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.deal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own templates"
  ON public.deal_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create templates"
  ON public.deal_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON public.deal_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON public.deal_templates FOR DELETE
  USING (auth.uid() = user_id);

-- ── ratings ──
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  rater_user_id uuid NOT NULL REFERENCES auth.users(id),
  rated_user_id uuid NOT NULL REFERENCES auth.users(id),
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text,
  role text NOT NULL CHECK (role IN ('client', 'freelancer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deal_id, rater_user_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ratings"
  ON public.ratings FOR SELECT
  USING (true);

CREATE POLICY "Deal participants can create ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = rater_user_id AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id
    AND d.status = 'completed'
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

CREATE INDEX idx_ratings_rated_user ON public.ratings(rated_user_id);
CREATE INDEX idx_ratings_deal ON public.ratings(deal_id);

-- ── disputes ──
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  initiated_by uuid NOT NULL REFERENCES auth.users(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'resolved_release',
                      'resolved_refund', 'resolved_partial')),
  resolution_notes text,
  resolution_amount integer, -- cents
  dispute_fee_amount integer, -- cents
  dispute_fee_charged_to text CHECK (dispute_fee_charged_to IN ('client', 'freelancer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal participants can read disputes"
  ON public.disputes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

CREATE POLICY "Platform admin can read all disputes"
  ON public.disputes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_platform_admin = true
  ));

CREATE POLICY "Deal participants can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (auth.uid() = initiated_by AND EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

CREATE POLICY "Platform admin can update disputes"
  ON public.disputes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_platform_admin = true
  ));

-- ── dispute_evidence ──
CREATE TABLE public.dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  evidence_type text NOT NULL
    CHECK (evidence_type IN ('screenshot', 'file', 'video', 'text', 'link')),
  file_url text,
  file_name text,
  file_size_bytes integer,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal participants can read dispute evidence"
  ON public.dispute_evidence FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.disputes disp
    JOIN public.deals d ON d.id = disp.deal_id
    WHERE disp.id = dispute_id
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

CREATE POLICY "Platform admin can read all dispute evidence"
  ON public.dispute_evidence FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.is_platform_admin = true
  ));

CREATE POLICY "Deal participants can submit evidence"
  ON public.dispute_evidence FOR INSERT
  WITH CHECK (auth.uid() = submitted_by AND EXISTS (
    SELECT 1 FROM public.disputes disp
    JOIN public.deals d ON d.id = disp.deal_id
    WHERE disp.id = dispute_id
    AND disp.status IN ('open', 'under_review')
    AND (d.client_user_id = auth.uid() OR d.freelancer_user_id = auth.uid())
  ));

-- ── email_notifications ──
CREATE TABLE public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  email_address text NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.email_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.email_notifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_notifications_user ON public.email_notifications(user_id);
CREATE INDEX idx_notifications_deal ON public.email_notifications(deal_id);

-- ─── STEP 6: Add FK from deal_templates to deals ───
ALTER TABLE public.deals
  ADD CONSTRAINT deals_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES public.deal_templates(id) ON DELETE SET NULL;

-- ─── STEP 7: Clean up storage buckets ───
-- Note: Storage bucket management is done via Supabase dashboard or API, not SQL.
-- The old buckets (logos, resumes, video-applications) should be manually deleted
-- and new buckets (deal-files, dispute-evidence, avatars) created.
-- See Step 7 in the instructions below.
