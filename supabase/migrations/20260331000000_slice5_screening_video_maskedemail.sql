-- ============================================================================
-- CheckHire Slice 5 — Screening Enhancements, Video Applications, Masked Email
-- 
-- New tables: masked_email_pairs, communication_logs, rejection_templates,
--             question_templates
-- Altered tables: job_listings, applications, screening_questions
-- New storage bucket: video-applications (private)
-- ============================================================================

-- ─── masked_email_pairs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.masked_email_pairs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  employer_id           UUID NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  applicant_user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_masked_email TEXT NOT NULL,
  applicant_masked_email TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN ('active', 'deactivated')) DEFAULT 'active',
  activated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deactivated_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(application_id)
);

ALTER TABLE public.masked_email_pairs ENABLE ROW LEVEL SECURITY;

-- Employers can read masked pairs on their own listings' applications
CREATE POLICY "Employers can read own masked pairs"
  ON public.masked_email_pairs FOR SELECT
  USING (
    employer_id IN (
      SELECT eu.employer_id FROM public.employer_users eu
      WHERE eu.user_id = auth.uid()
    )
  );

-- Candidates can read their own masked pairs
CREATE POLICY "Candidates can read own masked pairs"
  ON public.masked_email_pairs FOR SELECT
  USING (applicant_user_id = auth.uid());

-- Only service role inserts/updates (from API routes)
CREATE POLICY "Service role manages masked pairs"
  ON public.masked_email_pairs FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX idx_masked_email_employer ON public.masked_email_pairs(employer_masked_email) WHERE status = 'active';
CREATE INDEX idx_masked_email_applicant ON public.masked_email_pairs(applicant_masked_email) WHERE status = 'active';
CREATE INDEX idx_masked_email_application ON public.masked_email_pairs(application_id);

-- ─── communication_logs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  masked_email_pair_id  UUID REFERENCES public.masked_email_pairs(id) ON DELETE SET NULL,
  communication_type    TEXT NOT NULL CHECK (communication_type IN ('email', 'call', 'sms')),
  direction             TEXT NOT NULL CHECK (direction IN ('employer_to_applicant', 'applicant_to_employer')),
  subject_snippet       TEXT,
  timestamp             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- No client reads — only service role inserts from API routes
CREATE POLICY "No client access to communication logs"
  ON public.communication_logs
  USING (false)
  WITH CHECK (false);

CREATE INDEX idx_comm_logs_pair ON public.communication_logs(masked_email_pair_id);

-- ─── rejection_templates ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rejection_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES public.employers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  message_text TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rejection_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read platform defaults (employer_id IS NULL)
CREATE POLICY "Anyone can read default rejection templates"
  ON public.rejection_templates FOR SELECT
  USING (employer_id IS NULL AND is_default = true);

-- Employers can read their own custom templates
CREATE POLICY "Employers can read own rejection templates"
  ON public.rejection_templates FOR SELECT
  USING (
    employer_id IN (
      SELECT eu.employer_id FROM public.employer_users eu
      WHERE eu.user_id = auth.uid()
    )
  );

-- Employers can create custom templates
CREATE POLICY "Employers can create rejection templates"
  ON public.rejection_templates FOR INSERT
  WITH CHECK (
    employer_id IN (
      SELECT eu.employer_id FROM public.employer_users eu
      WHERE eu.user_id = auth.uid()
    )
  );

-- Employers can delete their own custom templates
CREATE POLICY "Employers can delete own rejection templates"
  ON public.rejection_templates FOR DELETE
  USING (
    employer_id IN (
      SELECT eu.employer_id FROM public.employer_users eu
      WHERE eu.user_id = auth.uid()
    )
    AND is_default = false
  );

-- ─── question_templates ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.question_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id           UUID REFERENCES public.employers(id) ON DELETE CASCADE,
  category              TEXT NOT NULL CHECK (category IN (
                          'remote_readiness', 'sales', 'technical',
                          'customer_service', 'general'
                        )),
  name                  TEXT NOT NULL,
  questions             JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_platform_default   BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.question_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can read platform defaults
CREATE POLICY "Anyone can read default question templates"
  ON public.question_templates FOR SELECT
  USING (is_platform_default = true);

-- Employers can read their own custom templates
CREATE POLICY "Employers can read own question templates"
  ON public.question_templates FOR SELECT
  USING (
    employer_id IN (
      SELECT eu.employer_id FROM public.employer_users eu
      WHERE eu.user_id = auth.uid()
    )
  );

-- Employers can create custom templates
CREATE POLICY "Employers can create question templates"
  ON public.question_templates FOR INSERT
  WITH CHECK (
    employer_id IN (
      SELECT eu.employer_id FROM public.employer_users eu
      WHERE eu.user_id = auth.uid()
    )
  );

-- ─── ALTER: job_listings — add video_questions ─────────────────────────────
ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS video_questions JSONB DEFAULT '[]'::jsonb;

-- ─── ALTER: applications — add video_responses, screening_score, withdrawn ─
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS video_responses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS screening_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ DEFAULT NULL;

-- Update the status check constraint to include 'withdrawn'
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'applied', 'reviewed', 'shortlisted',
    'interview_requested', 'interview_accepted',
    'offered', 'rejected', 'hired', 'withdrawn'
  ));

-- ─── ALTER: screening_questions — add scoring & knockout fields ────────────
ALTER TABLE public.screening_questions
  ADD COLUMN IF NOT EXISTS is_knockout BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS knockout_answer TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS point_value INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_length INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS question_category TEXT DEFAULT NULL;

-- ─── Storage: create private video-applications bucket ─────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-applications', 'video-applications', false)
ON CONFLICT (id) DO NOTHING;

-- Seekers can upload videos to their own folder
CREATE POLICY "Seekers can upload own videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'video-applications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Seekers can read their own videos
CREATE POLICY "Seekers can read own videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'video-applications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Seekers can delete their own videos
CREATE POLICY "Seekers can delete own videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'video-applications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── SEED: rejection_templates (platform defaults) ─────────────────────────
INSERT INTO public.rejection_templates (employer_id, name, message_text, is_default) VALUES
  (NULL, 'General — moved forward', 'Thank you for applying. After careful review, we''ve decided to move forward with other candidates whose experience more closely matches our current needs. We appreciate your interest and wish you the best in your search.', true),
  (NULL, 'Skills gap', 'Thank you for your application. We''re looking for deeper experience in a specific area for this role. We encourage you to apply again in the future as your skills develop.', true),
  (NULL, 'Qualification required', 'Thank you for your interest. This role requires a specific qualification or certification that was not reflected in your application. If you obtain it in the future, we''d welcome a new application.', true),
  (NULL, 'Internal hire', 'Thank you for applying. We''ve decided to fill this position with an internal candidate. We appreciate your time and encourage you to check back for future openings.', true),
  (NULL, 'Position on hold', 'Thank you for your interest. This position has been put on hold due to business changes. If it reopens, we''ll repost it and welcome your application at that time.', true)
ON CONFLICT DO NOTHING;

-- ─── SEED: question_templates (platform defaults) ──────────────────────────
INSERT INTO public.question_templates (employer_id, category, name, questions, is_platform_default) VALUES
  (
    NULL, 'remote_readiness', 'Remote Work Readiness',
    '[
      {"question_text": "Do you have a dedicated workspace at home?", "question_type": "yes_no", "options": null, "is_knockout": true, "knockout_answer": "No", "point_value": 5},
      {"question_text": "What time zone are you based in?", "question_type": "short_answer", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 0},
      {"question_text": "How many years of remote work experience do you have?", "question_type": "numerical", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 10},
      {"question_text": "How do you handle communication across time zones?", "question_type": "short_answer", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 0, "min_length": 100},
      {"question_text": "Are you available for occasional overlap with US Eastern hours?", "question_type": "yes_no", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 5}
    ]'::jsonb,
    true
  ),
  (
    NULL, 'sales', 'Sales Role Screening',
    '[
      {"question_text": "Do you have experience with outbound sales?", "question_type": "yes_no", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 5},
      {"question_text": "How many years of sales experience do you have?", "question_type": "numerical", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 10},
      {"question_text": "Describe your approach to qualifying a lead.", "question_type": "short_answer", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 0, "min_length": 150},
      {"question_text": "Are you comfortable with commission-based compensation?", "question_type": "yes_no", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 0},
      {"question_text": "What CRM tools have you used?", "question_type": "short_answer", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 0}
    ]'::jsonb,
    true
  ),
  (
    NULL, 'technical', 'Technical Skills Assessment',
    '[
      {"question_text": "How many years of programming experience do you have?", "question_type": "numerical", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 10},
      {"question_text": "Which programming languages are you proficient in?", "question_type": "short_answer", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 0},
      {"question_text": "Describe a recent technical challenge you solved.", "question_type": "short_answer", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 0, "min_length": 200},
      {"question_text": "Are you familiar with version control (Git)?", "question_type": "yes_no", "options": null, "is_knockout": true, "knockout_answer": "No", "point_value": 5},
      {"question_text": "Do you have experience with cloud platforms (AWS, GCP, or Azure)?", "question_type": "yes_no", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 5}
    ]'::jsonb,
    true
  ),
  (
    NULL, 'customer_service', 'Customer Service Screening',
    '[
      {"question_text": "How many years of customer-facing experience do you have?", "question_type": "numerical", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 10},
      {"question_text": "Describe how you would handle an angry customer.", "question_type": "short_answer", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 0, "min_length": 150},
      {"question_text": "Are you comfortable working weekends if needed?", "question_type": "yes_no", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 0},
      {"question_text": "What support tools have you used (Zendesk, Intercom, Freshdesk, etc.)?", "question_type": "short_answer", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 0}
    ]'::jsonb,
    true
  ),
  (
    NULL, 'general', 'General Screening',
    '[
      {"question_text": "Why are you interested in this role?", "question_type": "short_answer", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 0, "min_length": 100},
      {"question_text": "When is the earliest you could start?", "question_type": "short_answer", "options": null, "is_knockout": false, "knockout_answer": null, "point_value": 0},
      {"question_text": "Are you authorized to work in the required location?", "question_type": "yes_no", "options": null, "is_knockout": true, "knockout_answer": "No", "point_value": 0}
    ]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;
