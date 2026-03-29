-- Storage bucket for deal file attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deal-files',
  'deal-files',
  false,
  20971520,
  ARRAY['image/png','image/jpeg','image/gif','image/webp',
        'application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain','application/zip']
);

-- Deal participants can upload files
CREATE POLICY "Deal participants can upload files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'deal-files'
  AND (storage.foldername(name))[1] = 'deals'
  AND EXISTS (
    SELECT 1 FROM public.deals
    WHERE id::text = (storage.foldername(name))[2]
    AND (client_user_id = auth.uid() OR freelancer_user_id = auth.uid())
  )
);

-- Deal participants can read their deal's files
CREATE POLICY "Deal participants can read files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'deal-files'
  AND EXISTS (
    SELECT 1 FROM public.deals
    WHERE id::text = (storage.foldername(name))[2]
    AND (client_user_id = auth.uid() OR freelancer_user_id = auth.uid())
  )
);
