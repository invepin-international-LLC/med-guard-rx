
-- 1. Recreate caregiver_patient_profiles view with access control built in
CREATE OR REPLACE VIEW public.caregiver_patient_profiles
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.user_id,
  p.name,
  p.date_of_birth,
  p.allergies,
  p.conditions,
  p.font_size,
  p.high_contrast_mode,
  p.voice_enabled,
  p.biometric_enabled,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE
  p.user_id = auth.uid()
  OR public.is_caregiver_for(p.user_id);

-- 2. Fix caregiver_invitations: drop the ALL policy and replace with specific policies that include WITH CHECK
DROP POLICY IF EXISTS "Patients can manage their invitations" ON public.caregiver_invitations;

-- Patients can view their own invitations
CREATE POLICY "Patients can view their invitations"
ON public.caregiver_invitations
FOR SELECT
USING (auth.uid() = patient_id);

-- Patients can create invitations only for themselves
CREATE POLICY "Patients can create their invitations"
ON public.caregiver_invitations
FOR INSERT
WITH CHECK (auth.uid() = patient_id);

-- Patients can update their own invitations
CREATE POLICY "Patients can update their invitations"
ON public.caregiver_invitations
FOR UPDATE
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);

-- Patients can delete their own invitations
CREATE POLICY "Patients can delete their invitations"
ON public.caregiver_invitations
FOR DELETE
USING (auth.uid() = patient_id);
