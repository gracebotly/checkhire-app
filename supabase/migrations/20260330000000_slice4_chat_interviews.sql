-- ============================================================================
-- CheckHire Slice 4 — Messages, Interview Schedules, Rate Limit Events
-- New tables: messages, interview_schedules, rate_limit_events
-- Enables Supabase Realtime on messages table
-- ============================================================================

-- ─── messages ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id),
  sender_type     TEXT NOT NULL CHECK (sender_type IN ('employer', 'candidate', 'system')),
  message_text    TEXT NOT NULL,
  message_type    TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN (
                    'text', 'system', 'interview_request', 'interview_response',
                    'status_change', 'interview_scheduled', 'slot_selected'
                  )),
  metadata        JSONB,
  read_at         TIMESTAMPTZ,
  edited_at       TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Candidates can read messages on their own applications
CREATE POLICY "Candidates can read own application messages"
  ON public.messages FOR SELECT
  USING (
    application_id IN (
      SELECT a.id FROM public.applications a WHERE a.user_id = auth.uid()
    )
  );

-- Candidates can send messages on their own applications
CREATE POLICY "Candidates can send messages on own applications"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND application_id IN (
      SELECT a.id FROM public.applications a WHERE a.user_id = auth.uid()
    )
  );

-- Employers can read messages on their listings' applications
CREATE POLICY "Employers can read messages on own listings"
  ON public.messages FOR SELECT
  USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      WHERE a.job_listing_id IN (
        SELECT jl.id FROM public.job_listings jl
        WHERE jl.employer_id IN (
          SELECT eu.employer_id FROM public.employer_users eu
          WHERE eu.user_id = auth.uid()
        )
      )
    )
  );

-- Employers can send messages on their listings' applications
CREATE POLICY "Employers can send messages on own listings"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND application_id IN (
      SELECT a.id FROM public.applications a
      WHERE a.job_listing_id IN (
        SELECT jl.id FROM public.job_listings jl
        WHERE jl.employer_id IN (
          SELECT eu.employer_id FROM public.employer_users eu
          WHERE eu.user_id = auth.uid()
        )
      )
    )
  );

-- Candidates can mark messages as read on their own applications
CREATE POLICY "Candidates can update read_at on own messages"
  ON public.messages FOR UPDATE
  USING (
    application_id IN (
      SELECT a.id FROM public.applications a WHERE a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    application_id IN (
      SELECT a.id FROM public.applications a WHERE a.user_id = auth.uid()
    )
  );

-- Employers can mark messages as read on their listings' applications
CREATE POLICY "Employers can update read_at on own listings messages"
  ON public.messages FOR UPDATE
  USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      WHERE a.job_listing_id IN (
        SELECT jl.id FROM public.job_listings jl
        WHERE jl.employer_id IN (
          SELECT eu.employer_id FROM public.employer_users eu
          WHERE eu.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    application_id IN (
      SELECT a.id FROM public.applications a
      WHERE a.job_listing_id IN (
        SELECT jl.id FROM public.job_listings jl
        WHERE jl.employer_id IN (
          SELECT eu.employer_id FROM public.employer_users eu
          WHERE eu.user_id = auth.uid()
        )
      )
    )
  );

-- Service role can insert system messages (from API routes)
CREATE POLICY "Service role can insert system messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_type = 'system');

CREATE INDEX idx_messages_application ON public.messages(application_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_unread ON public.messages(application_id, read_at) WHERE read_at IS NULL;

-- Enable Supabase Realtime on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ─── interview_schedules ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interview_schedules (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id       UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  proposed_by          UUID NOT NULL REFERENCES auth.users(id),
  proposed_slots       JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_slot        JSONB,
  video_call_link      TEXT,
  notes                TEXT,
  timezone_employer    TEXT,
  timezone_candidate   TEXT,
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                         'pending', 'accepted', 'declined', 'cancelled', 'completed'
                       )),
  accepted_at          TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_schedules ENABLE ROW LEVEL SECURITY;

-- Candidates can read interview schedules on their own applications
CREATE POLICY "Candidates can read own interview schedules"
  ON public.interview_schedules FOR SELECT
  USING (
    application_id IN (
      SELECT a.id FROM public.applications a WHERE a.user_id = auth.uid()
    )
  );

-- Employers can read/create interview schedules on their listings' applications
CREATE POLICY "Employers can read interview schedules on own listings"
  ON public.interview_schedules FOR SELECT
  USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      WHERE a.job_listing_id IN (
        SELECT jl.id FROM public.job_listings jl
        WHERE jl.employer_id IN (
          SELECT eu.employer_id FROM public.employer_users eu
          WHERE eu.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Employers can create interview schedules on own listings"
  ON public.interview_schedules FOR INSERT
  WITH CHECK (
    proposed_by = auth.uid()
    AND application_id IN (
      SELECT a.id FROM public.applications a
      WHERE a.job_listing_id IN (
        SELECT jl.id FROM public.job_listings jl
        WHERE jl.employer_id IN (
          SELECT eu.employer_id FROM public.employer_users eu
          WHERE eu.user_id = auth.uid()
        )
      )
    )
  );

-- Both parties can update (candidate selects slot, employer cancels, etc.)
CREATE POLICY "Candidates can update own interview schedules"
  ON public.interview_schedules FOR UPDATE
  USING (
    application_id IN (
      SELECT a.id FROM public.applications a WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Employers can update interview schedules on own listings"
  ON public.interview_schedules FOR UPDATE
  USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      WHERE a.job_listing_id IN (
        SELECT jl.id FROM public.job_listings jl
        WHERE jl.employer_id IN (
          SELECT eu.employer_id FROM public.employer_users eu
          WHERE eu.user_id = auth.uid()
        )
      )
    )
  );

CREATE INDEX idx_interview_schedules_application ON public.interview_schedules(application_id);

CREATE TRIGGER set_updated_at_interview_schedules
  BEFORE UPDATE ON public.interview_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── rate_limit_events ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id   UUID,
  endpoint      TEXT NOT NULL,
  hits_in_window INTEGER NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  window_end    TIMESTAMPTZ NOT NULL,
  flagged       BOOLEAN NOT NULL DEFAULT false,
  reviewed      BOOLEAN NOT NULL DEFAULT false,
  reviewed_by   UUID,
  resolution    TEXT CHECK (resolution IN ('cleared', 'warned', 'suspended')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- No client access — only service role inserts from API routes
CREATE POLICY "No client access to rate limit events"
  ON public.rate_limit_events
  USING (false)
  WITH CHECK (false);

CREATE INDEX idx_rate_limit_events_employer ON public.rate_limit_events(employer_id, created_at DESC);
