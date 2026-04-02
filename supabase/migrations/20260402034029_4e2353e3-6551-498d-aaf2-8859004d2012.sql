-- 1. Recreate caregiver_patient_profiles view with security_invoker
DROP VIEW IF EXISTS public.caregiver_patient_profiles;
CREATE VIEW public.caregiver_patient_profiles
WITH (security_invoker = true)
AS
SELECT id, user_id, name, date_of_birth, allergies, conditions, font_size,
       high_contrast_mode, voice_enabled, biometric_enabled, created_at, updated_at
FROM public.profiles p
WHERE public.is_caregiver_for(p.user_id);

-- 2. Pill-images storage: add UPDATE and DELETE policies scoped to user folder
CREATE POLICY "Users can update their own pill images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'pill-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own pill images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'pill-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Caregiver relationships: restrict INSERT so only the patient can add rows for themselves
-- First drop the ALL policy and replace with specific ones
DROP POLICY IF EXISTS "Patients can manage their caregiver relationships" ON public.caregiver_relationships;

CREATE POLICY "Patients can view their caregiver relationships"
ON public.caregiver_relationships
FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert their own caregiver relationships"
ON public.caregiver_relationships
FOR INSERT
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update their caregiver relationships"
ON public.caregiver_relationships
FOR UPDATE
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can delete their caregiver relationships"
ON public.caregiver_relationships
FOR DELETE
USING (auth.uid() = patient_id);

-- 4. HIPAA access log: block DELETE and UPDATE to preserve audit integrity
CREATE POLICY "Block HIPAA access log deletions"
ON public.hipaa_access_log
FOR DELETE
USING (false);

CREATE POLICY "Block HIPAA access log updates"
ON public.hipaa_access_log
FOR UPDATE
USING (false);

-- 5. Caregiver notifications: replace ALL with specific policies including WITH CHECK on INSERT
DROP POLICY IF EXISTS "Users can view their caregiver notifications" ON public.caregiver_notifications;

CREATE POLICY "Users can view their caregiver notifications"
ON public.caregiver_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own caregiver notifications"
ON public.caregiver_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their caregiver notifications"
ON public.caregiver_notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their caregiver notifications"
ON public.caregiver_notifications
FOR DELETE
USING (auth.uid() = user_id);