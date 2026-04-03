-- Phase 2: Enhanced applications — portfolio, file uploads, screening questions

-- 1. Add screening_questions JSONB column to deals
-- Format: [{ id: "q1", type: "yes_no"|"short_text"|"multiple_choice", text: "...", options?: ["A","B"], dealbreaker_answer?: "no"|"A" }]
ALTER TABLE public.deals
  ADD COLUMN screening_questions jsonb DEFAULT '[]'::jsonb;

-- 2. Add columns to deal_interest for enhanced applications
-- portfolio_urls: array of 1-3 URL strings
-- screening_answers: JSONB matching the deal's screening_questions
-- Format: [{ question_id: "q1", answer: "yes"|"no"|"text"|"A" }]
ALTER TABLE public.deal_interest
  ADD COLUMN portfolio_urls text[] DEFAULT '{}',
  ADD COLUMN screening_answers jsonb DEFAULT '[]'::jsonb;

-- 3. Expand pitch_text max length from 500 to 1000
ALTER TABLE public.deal_interest
  DROP CONSTRAINT IF EXISTS deal_interest_pitch_text_check;

ALTER TABLE public.deal_interest
  ADD CONSTRAINT deal_interest_pitch_text_check
  CHECK (char_length(pitch_text) >= 20 AND char_length(pitch_text) <= 1000);

-- 4. Create application_files table for resume/sample uploads
CREATE TABLE public.application_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id uuid NOT NULL REFERENCES public.deal_interest(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes integer NOT NULL,
  file_type text NOT NULL DEFAULT 'sample',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.application_files ENABLE ROW LEVEL SECURITY;

-- Applicant can read their own files
CREATE POLICY "Applicant can read own application files"
  ON public.application_files FOR SELECT
  USING (auth.uid() = user_id);

-- Client can read all application files on their deals
CREATE POLICY "Client can read deal application files"
  ON public.application_files FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = deal_id
    AND d.client_user_id = auth.uid()
  ));

-- Applicant can insert their own files
CREATE POLICY "Applicant can upload application files"
  ON public.application_files FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.deal_interest di
      WHERE di.id = interest_id
      AND di.user_id = auth.uid()
      AND di.status IN ('pending', 'in_conversation')
    )
  );

CREATE INDEX idx_application_files_interest ON public.application_files(interest_id);
