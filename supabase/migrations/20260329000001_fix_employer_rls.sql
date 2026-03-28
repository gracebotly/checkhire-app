-- ============================================================================
-- Fix RLS policies for employer_users and employers
-- Applied to Supabase project mlwdypwarvzwqnrvsnak on 2026-03-29
--
-- Issue 1: employer_users had no UPDATE/DELETE policies
-- Issue 2: employers UPDATE policy only checked claimed_by, not employer_users admin role
--
-- This migration has already been applied to the live database.
-- DO NOT run this against the live database — it will fail.
-- ============================================================================

-- employer_users: Add UPDATE policy for admins
CREATE POLICY "Admins can update team members"
ON public.employer_users
FOR UPDATE
USING (
  employer_id IN (
    SELECT eu.employer_id FROM public.employer_users eu
    WHERE eu.user_id = auth.uid() AND eu.role = 'admin'
  )
);

-- employer_users: Add DELETE policy for admins
CREATE POLICY "Admins can remove team members"
ON public.employer_users
FOR DELETE
USING (
  employer_id IN (
    SELECT eu.employer_id FROM public.employer_users eu
    WHERE eu.user_id = auth.uid() AND eu.role = 'admin'
  )
);

-- employers: Replace UPDATE policy to check admin role instead of just claimed_by
DROP POLICY IF EXISTS "Employer admins can update own company" ON public.employers;

CREATE POLICY "Employer admins can update own company"
ON public.employers
FOR UPDATE
USING (
  id IN (
    SELECT eu.employer_id FROM public.employer_users eu
    WHERE eu.user_id = auth.uid() AND eu.role = 'admin'
  )
);
