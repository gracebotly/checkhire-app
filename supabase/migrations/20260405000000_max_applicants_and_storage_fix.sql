-- 1. Add max_applicants column to deals (nullable integer, default 15)
ALTER TABLE public.deals ADD COLUMN max_applicants integer DEFAULT 15;

-- 2. Fix storage policy: allow authenticated users to upload application files
-- The existing "Deal participants can upload files" policy only allows
-- client_user_id and freelancer_user_id. Applicants are neither — they're
-- visitors applying to a public deal. This new policy allows any
-- authenticated user to upload to the applications/ subfolder of any deal.
CREATE POLICY "Applicants can upload application files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-files'
  AND (storage.foldername(name))[1] = 'deals'
  AND (storage.foldername(name))[3] = 'applications'
);

-- 3. Allow deal clients to read application files in storage
-- The existing "Deal participants can read files" policy works for participants
-- but applicants' files are in the applications/ subfolder. The client needs
-- to read these when reviewing applications.
CREATE POLICY "Clients can read application files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-files'
  AND (storage.foldername(name))[1] = 'deals'
  AND (storage.foldername(name))[3] = 'applications'
  AND EXISTS (
    SELECT 1 FROM public.deals
    WHERE id::text = (storage.foldername(name))[2]
    AND client_user_id = auth.uid()
  )
);

-- 4. Allow applicants to read their own uploaded application files
CREATE POLICY "Applicants can read own application files in storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-files'
  AND (storage.foldername(name))[1] = 'deals'
  AND (storage.foldername(name))[3] = 'applications'
  AND (storage.foldername(name))[4] = 'pending'
  AND EXISTS (
    SELECT 1 FROM storage.objects o2
    WHERE o2.name = name
    AND o2.owner = auth.uid()::text
  )
);
