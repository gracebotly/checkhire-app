-- ============================================================================
-- CheckHire Slice 3 — Seeker Profiles, Applications, Pseudonyms, Audit Log
-- Applied to Supabase project mlwdypwarvzwqnrvsnak
--
-- New tables: seeker_profiles, applications, pseudonym_adjectives,
--             pseudonym_nouns, access_audit_log
-- New functions: assign_pseudonym, increment_application_count
-- New storage bucket: resumes (private)
-- ============================================================================

-- ─── seeker_profiles ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seeker_profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  skills                TEXT[] DEFAULT '{}',
  years_experience      INTEGER,
  location_city         TEXT,
  location_state        TEXT,
  education_level       TEXT,
  education_field       TEXT,
  resume_file_url       TEXT,
  parsed_work_history   JSONB DEFAULT '[]'::jsonb,
  parsed_education      JSONB DEFAULT '[]'::jsonb,
  parsed_certifications JSONB DEFAULT '[]'::jsonb,
  parsed_summary        TEXT,
  parse_status          TEXT NOT NULL CHECK (parse_status IN ('pending', 'parsed', 'failed')) DEFAULT 'pending',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seeker_profiles ENABLE ROW LEVEL SECURITY;

-- Seekers can read and update their own profile
CREATE POLICY "Seekers can read own profile"
  ON public.seeker_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Seekers can update own profile"
  ON public.seeker_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role inserts on signup (from auth callback)
CREATE POLICY "Service role can insert seeker profiles"
  ON public.seeker_profiles FOR INSERT
  WITH CHECK (true);

-- Employers NEVER query this table directly. Data flows through the
-- applications API with disclosure gating applied server-side.

CREATE TRIGGER set_updated_at_seeker_profiles
  BEFORE UPDATE ON public.seeker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── pseudonym_adjectives ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pseudonym_adjectives (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word       TEXT NOT NULL UNIQUE,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pseudonym_adjectives ENABLE ROW LEVEL SECURITY;

-- Public read — needed by the assign_pseudonym function via authenticated calls
CREATE POLICY "Anyone can read active adjectives"
  ON public.pseudonym_adjectives FOR SELECT
  USING (active = true);

-- ─── pseudonym_nouns ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pseudonym_nouns (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word       TEXT NOT NULL UNIQUE,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pseudonym_nouns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active nouns"
  ON public.pseudonym_nouns FOR SELECT
  USING (active = true);

-- ─── applications ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_listing_id      UUID NOT NULL REFERENCES public.job_listings(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudonym           TEXT NOT NULL,
  disclosure_level    INTEGER NOT NULL DEFAULT 1 CHECK (disclosure_level IN (1, 2, 3)),
  status              TEXT NOT NULL DEFAULT 'applied' CHECK (status IN (
                        'applied', 'reviewed', 'shortlisted',
                        'interview_requested', 'interview_accepted',
                        'offered', 'rejected', 'hired'
                      )),
  screening_responses JSONB,
  disclosed_at_stage2 TIMESTAMPTZ,
  disclosed_at_stage3 TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_listing_id, user_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Seekers can read their own applications
CREATE POLICY "Seekers can read own applications"
  ON public.applications FOR SELECT
  USING (auth.uid() = user_id);

-- Seekers can create applications (apply to jobs)
CREATE POLICY "Seekers can create applications"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Employers can read applications on their own listings
CREATE POLICY "Employers can read applications on own listings"
  ON public.applications FOR SELECT
  USING (
    job_listing_id IN (
      SELECT jl.id FROM public.job_listings jl
      WHERE jl.employer_id IN (
        SELECT eu.employer_id FROM public.employer_users eu
        WHERE eu.user_id = auth.uid()
      )
    )
  );

-- Employers can update application status on their own listings
CREATE POLICY "Employers can update applications on own listings"
  ON public.applications FOR UPDATE
  USING (
    job_listing_id IN (
      SELECT jl.id FROM public.job_listings jl
      WHERE jl.employer_id IN (
        SELECT eu.employer_id FROM public.employer_users eu
        WHERE eu.user_id = auth.uid()
      )
    )
  );

CREATE INDEX idx_applications_listing ON public.applications(job_listing_id);
CREATE INDEX idx_applications_user ON public.applications(user_id);
CREATE INDEX idx_applications_status ON public.applications(job_listing_id, status);

-- ─── access_audit_log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.access_audit_log (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id             UUID,
  employer_user_id        UUID,
  action_type             TEXT NOT NULL CHECK (action_type IN (
                            'candidate_view', 'interview_request',
                            'message_sent', 'stage_advance', 'resume_access'
                          )),
  application_id          UUID,
  disclosure_level_at_time INTEGER,
  ip_address              TEXT,
  user_agent              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;

-- No client reads — only service role inserts from API routes
CREATE POLICY "No client access to audit log"
  ON public.access_audit_log
  USING (false)
  WITH CHECK (false);

CREATE INDEX idx_audit_log_employer ON public.access_audit_log(employer_id, created_at DESC);
CREATE INDEX idx_audit_log_application ON public.access_audit_log(application_id);

-- ─── Function: assign_pseudonym ────────────────────────────────────────────
-- Returns a random "Adjective Noun" pair not already used on the given listing.
-- Called via supabase.rpc('assign_pseudonym', { p_listing_id: '...' })
CREATE OR REPLACE FUNCTION public.assign_pseudonym(p_listing_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pseudonym TEXT;
BEGIN
  SELECT a.word || ' ' || n.word INTO v_pseudonym
  FROM public.pseudonym_adjectives a
  CROSS JOIN public.pseudonym_nouns n
  WHERE a.active = true AND n.active = true
    AND (a.word || ' ' || n.word) NOT IN (
      SELECT app.pseudonym FROM public.applications app
      WHERE app.job_listing_id = p_listing_id
    )
  ORDER BY random()
  LIMIT 1;

  IF v_pseudonym IS NULL THEN
    -- Fallback: all combinations exhausted (extremely unlikely with 200x200=40000).
    -- Generate a unique fallback with a random suffix.
    v_pseudonym := 'Candidate ' || substr(gen_random_uuid()::text, 1, 8);
  END IF;

  RETURN v_pseudonym;
END;
$$;

-- ─── Function: increment_application_count ─────────────────────────────────
-- Atomically increments the count and returns true if under the cap.
-- Returns false if the cap has been reached (application should be rejected).
CREATE OR REPLACE FUNCTION public.increment_application_count(p_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current INTEGER;
  v_max INTEGER;
BEGIN
  SELECT current_application_count, max_applications
  INTO v_current, v_max
  FROM public.job_listings
  WHERE id = p_listing_id
  FOR UPDATE;  -- Row-level lock for atomicity

  IF v_current IS NULL THEN
    RETURN false;  -- Listing not found
  END IF;

  IF v_current >= v_max THEN
    RETURN false;  -- Cap reached
  END IF;

  UPDATE public.job_listings
  SET current_application_count = current_application_count + 1
  WHERE id = p_listing_id;

  RETURN true;
END;
$$;

-- ─── Seed: pseudonym adjectives (~200 curated words) ───────────────────────
INSERT INTO public.pseudonym_adjectives (word) VALUES
  ('Amber'),('Ancient'),('Arctic'),('Autumn'),('Azure'),
  ('Blazing'),('Bold'),('Brave'),('Bright'),('Brilliant'),
  ('Calm'),('Cedar'),('Cerulean'),('Clear'),('Clever'),
  ('Cobalt'),('Cool'),('Copper'),('Coral'),('Cosmic'),
  ('Crimson'),('Crystal'),('Curious'),('Cyan'),('Daring'),
  ('Dawn'),('Deep'),('Deft'),('Distant'),('Dusk'),
  ('Early'),('Eastern'),('Ember'),('Emerald'),('Endless'),
  ('Fair'),('Fearless'),('Fern'),('Fierce'),('Flint'),
  ('Forest'),('Frost'),('Gentle'),('Gilded'),('Gleaming'),
  ('Global'),('Golden'),('Grand'),('Granite'),('Harbor'),
  ('Hazel'),('Honest'),('Horizon'),('Humble'),('Indigo'),
  ('Inner'),('Iron'),('Ivory'),('Jade'),('Jasper'),
  ('Keen'),('Kind'),('Lapis'),('Lark'),('Lasting'),
  ('Lemon'),('Light'),('Lilac'),('Linen'),('Lively'),
  ('Lunar'),('Maple'),('Marble'),('Marine'),('Marsh'),
  ('Meadow'),('Mellow'),('Midnight'),('Mighty'),('Mint'),
  ('Misty'),('Modest'),('Moonlit'),('Mossy'),('Mountain'),
  ('Navy'),('Nimble'),('Noble'),('Nordic'),('Northern'),
  ('Oaken'),('Ocean'),('Olive'),('Onyx'),('Opal'),
  ('Open'),('Orchid'),('Pacific'),('Patient'),('Pearl'),
  ('Pine'),('Plains'),('Polar'),('Prairie'),('Prism'),
  ('Pure'),('Quartz'),('Quiet'),('Radiant'),('Rapid'),
  ('Raven'),('Ready'),('Reef'),('Ridge'),('Rising'),
  ('River'),('Robust'),('Rocky'),('Rowan'),('Ruby'),
  ('Rustic'),('Sage'),('Sand'),('Sapphire'),('Scarlet'),
  ('Serene'),('Sharp'),('Sierra'),('Silent'),('Silver'),
  ('Sky'),('Slate'),('Smooth'),('Solar'),('Solid'),
  ('Southern'),('Spring'),('Spruce'),('Steady'),('Steel'),
  ('Sterling'),('Still'),('Stone'),('Storm'),('Strong'),
  ('Summit'),('Sunny'),('Sure'),('Swift'),('Tawny'),
  ('Teal'),('Terra'),('Thistle'),('Timber'),('Topaz'),
  ('Tranquil'),('True'),('Twilight'),('Upper'),('Valiant'),
  ('Valley'),('Vast'),('Velvet'),('Venture'),('Verdant'),
  ('Vivid'),('Warm'),('Western'),('Wild'),('Willow'),
  ('Wind'),('Winter'),('Wise'),('Wren'),('Zenith'),
  ('Zephyr'),('Agate'),('Birch'),('Crest'),('Delta'),
  ('Dune'),('Eagle'),('Flare'),('Gale'),('Grove'),
  ('Heath'),('Inlet'),('Jetty'),('Kindle'),('Lantern'),
  ('Mist'),('Nexus'),('Orbit'),('Peak'),('Quest'),
  ('Rapid'),('Shore'),('Tide'),('Unity'),('Vista')
ON CONFLICT (word) DO NOTHING;

-- ─── Seed: pseudonym nouns (~200 curated words) ────────────────────────────
INSERT INTO public.pseudonym_nouns (word) VALUES
  ('Anchor'),('Antler'),('Arch'),('Arrow'),('Atlas'),
  ('Badger'),('Basin'),('Bay'),('Beacon'),('Bear'),
  ('Birch'),('Bloom'),('Bluff'),('Boulder'),('Branch'),
  ('Bridge'),('Brook'),('Buck'),('Canyon'),('Cardinal'),
  ('Cavern'),('Cedar'),('Cliff'),('Cloud'),('Coast'),
  ('Condor'),('Coral'),('Cougar'),('Cove'),('Crane'),
  ('Creek'),('Crest'),('Crow'),('Dale'),('Dawn'),
  ('Deer'),('Dell'),('Dove'),('Drift'),('Drum'),
  ('Dune'),('Eagle'),('Elm'),('Ember'),('Falcon'),
  ('Fern'),('Finch'),('Fjord'),('Flame'),('Flint'),
  ('Ford'),('Fox'),('Frost'),('Garden'),('Gate'),
  ('Glacier'),('Glen'),('Gorge'),('Granite'),('Grove'),
  ('Gull'),('Harbor'),('Hare'),('Haven'),('Hawk'),
  ('Heath'),('Heron'),('Hill'),('Hollow'),('Horizon'),
  ('Ibis'),('Isle'),('Ivy'),('Jay'),('Juniper'),
  ('Kestrel'),('Knoll'),('Lake'),('Larch'),('Lark'),
  ('Laurel'),('Ledge'),('Lily'),('Lodge'),('Lotus'),
  ('Lynx'),('Maple'),('Marsh'),('Meadow'),('Mesa'),
  ('Mill'),('Mist'),('Moon'),('Moose'),('Moss'),
  ('Mountain'),('Myrtle'),('Nettle'),('Nighthawk'),('Noon'),
  ('Oak'),('Orchid'),('Oriole'),('Osprey'),('Otter'),
  ('Owl'),('Palm'),('Panther'),('Pass'),('Path'),
  ('Peak'),('Pebble'),('Pelican'),('Perch'),('Pier'),
  ('Pike'),('Pine'),('Plover'),('Pond'),('Prairie'),
  ('Quail'),('Quarry'),('Raven'),('Reef'),('Ridge'),
  ('River'),('Robin'),('Rock'),('Root'),('Rose'),
  ('Sage'),('Sand'),('Sequoia'),('Shore'),('Shrike'),
  ('Sky'),('Slope'),('Snipe'),('Sparrow'),('Spring'),
  ('Spruce'),('Starling'),('Stone'),('Stork'),('Storm'),
  ('Stream'),('Summit'),('Swallow'),('Swan'),('Swift'),
  ('Sycamore'),('Talon'),('Tern'),('Thistle'),('Thorn'),
  ('Thrasher'),('Tide'),('Timber'),('Trail'),('Trout'),
  ('Tulip'),('Valley'),('Vane'),('Verge'),('Violet'),
  ('Vista'),('Warden'),('Warbler'),('Wave'),('Wharf'),
  ('Willow'),('Wind'),('Wolf'),('Wren'),('Yarrow'),
  ('Aspen'),('Blaze'),('Capstone'),('Drift'),('Echo'),
  ('Forge'),('Glade'),('Helm'),('Inlet'),('Jetty'),
  ('Keystone'),('Lantern'),('Mantle'),('Nave'),('Outpost'),
  ('Pinnacle'),('Quay'),('Rampart'),('Sentinel'),('Terrace')
ON CONFLICT (word) DO NOTHING;

-- ─── Storage: create private resumes bucket ────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: seekers can upload to their own folder
CREATE POLICY "Seekers can upload own resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: seekers can read their own resumes
CREATE POLICY "Seekers can read own resumes"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: seekers can update/overwrite their own resumes
CREATE POLICY "Seekers can update own resumes"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: seekers can delete their own resumes
CREATE POLICY "Seekers can delete own resumes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
