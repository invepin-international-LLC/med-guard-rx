-- Fix pill-images storage policy: enforce user-scoped upload paths
DROP POLICY IF EXISTS "Authenticated users can upload pill images" ON storage.objects;
CREATE POLICY "Authenticated users can upload pill images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'pill-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add DELETE policy for HIPAA records so users can delete their own
CREATE POLICY "Users can delete their own HIPAA records"
ON public.hipaa_records
FOR DELETE
USING (auth.uid() = user_id);