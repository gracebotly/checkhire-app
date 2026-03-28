-- ============================================================================
-- Rate Limits table + check_rate_limit RPC function
-- Applied to Supabase project mlwdypwarvzwqnrvsnak on 2026-03-29
--
-- Used by checkRateLimit() in src/lib/api/rateLimit.ts
-- This migration has already been applied to the live database.
-- DO NOT run this against the live database — it will fail.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key        TEXT NOT NULL,
  hits       INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_seconds INTEGER NOT NULL DEFAULT 60,
  PRIMARY KEY (key)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.rate_limits
  FOR ALL USING (false) WITH CHECK (false);

CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_window_seconds INTEGER DEFAULT 60,
  p_max_hits INTEGER DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hits INTEGER;
  v_window_start TIMESTAMPTZ;
  v_now TIMESTAMPTZ := now();
  v_window_end TIMESTAMPTZ;
  v_allowed BOOLEAN;
  v_remaining INTEGER;
  v_reset_ms BIGINT;
BEGIN
  SELECT hits, window_start INTO v_hits, v_window_start
  FROM public.rate_limits
  WHERE key = p_key;

  IF FOUND THEN
    IF v_window_start + (p_window_seconds || ' seconds')::INTERVAL < v_now THEN
      UPDATE public.rate_limits
      SET hits = 1, window_start = v_now, window_seconds = p_window_seconds
      WHERE key = p_key;
      v_hits := 1;
      v_window_start := v_now;
    ELSE
      UPDATE public.rate_limits
      SET hits = hits + 1
      WHERE key = p_key
      RETURNING hits INTO v_hits;
    END IF;
  ELSE
    INSERT INTO public.rate_limits (key, hits, window_start, window_seconds)
    VALUES (p_key, 1, v_now, p_window_seconds)
    ON CONFLICT (key) DO UPDATE
    SET hits = public.rate_limits.hits + 1,
        window_start = CASE
          WHEN public.rate_limits.window_start + (p_window_seconds || ' seconds')::INTERVAL < v_now
          THEN v_now
          ELSE public.rate_limits.window_start
        END,
        window_seconds = p_window_seconds
    RETURNING hits, window_start INTO v_hits, v_window_start;

    IF v_window_start IS NULL THEN
      v_window_start := v_now;
      v_hits := 1;
    END IF;
  END IF;

  v_allowed := v_hits <= p_max_hits;
  v_remaining := GREATEST(0, p_max_hits - v_hits);
  v_window_end := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;
  v_reset_ms := GREATEST(0, EXTRACT(EPOCH FROM (v_window_end - v_now))::BIGINT * 1000);

  RETURN json_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'reset_ms', v_reset_ms
  );
END;
$$;
