-- Fix 1: Recreate caregiver_patient_profiles view as SECURITY INVOKER
-- and restrict to only show profiles that the querying user is a caregiver for
DROP VIEW IF EXISTS public.caregiver_patient_profiles;

CREATE VIEW public.caregiver_patient_profiles
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
FROM profiles p
WHERE public.is_caregiver_for(p.user_id);

-- Fix 2: Drop the overly permissive SELECT policy on caregiver_invitations
-- and replace with a properly scoped one
DROP POLICY IF EXISTS "Invitees and patients can view invitations" ON public.caregiver_invitations;

CREATE POLICY "Invitees and patients can view invitations"
ON public.caregiver_invitations
FOR SELECT
USING (
  (patient_id = auth.uid())
  OR (invitee_email = (auth.jwt() ->> 'email'::text))
);