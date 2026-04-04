-- Storage policies for brief file uploads during deal creation.
-- Briefs are uploaded before a deal exists, so they go to briefs/{user_id}/
-- instead of deals/{deal_id}/.

-- Allow authenticated users to upload briefs to their own folder
CREATE POLICY "Users can upload briefs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-files'
  AND (storage.foldername(name))[1] = 'briefs'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to read their own briefs
CREATE POLICY "Users can read own briefs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-files'
  AND (storage.foldername(name))[1] = 'briefs'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow deal participants to read briefs attached to their deals
CREATE POLICY "Deal participants can read deal briefs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-files'
  AND (storage.foldername(name))[1] = 'briefs'
  AND EXISTS (
    SELECT 1 FROM public.deals
    WHERE (
      description_brief_url LIKE 'briefs/' || (storage.foldername(name))[2] || '/%'
      OR deliverables_brief_url LIKE 'briefs/' || (storage.foldername(name))[2] || '/%'
    )
    AND (client_user_id = auth.uid() OR freelancer_user_id = auth.uid())
  )
);
