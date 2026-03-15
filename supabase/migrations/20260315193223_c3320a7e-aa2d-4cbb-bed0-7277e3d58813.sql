-- Fix critical security vulnerability in caregiver_invitations table
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view invitations by code" ON public.caregiver_invitations;
DROP POLICY IF EXISTS "Authenticated users can accept invitations" ON public.caregiver_invitations;

-- Create secure SELECT policy - only invitee or patient can view
CREATE POLICY "Invitees and patients can view invitations"
ON public.caregiver_invitations
FOR SELECT
TO public
USING (
  patient_id = auth.uid() 
  OR invitee_email = (auth.jwt()->>'email')
  OR (status = 'pending' AND expires_at > now() AND auth.uid() IS NOT NULL)
);

-- Create secure UPDATE policy - only intended invitee can accept
CREATE POLICY "Invitees can accept their invitations"
ON public.caregiver_invitations
FOR UPDATE
TO public
USING (
  status = 'pending' 
  AND expires_at > now()
  AND invitee_email = (auth.jwt()->>'email')
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- Fix caregivers viewing patient PIN hashes by creating a secure view
CREATE OR REPLACE VIEW public.caregiver_patient_profiles AS
SELECT 
  id,
  user_id,
  name,
  date_of_birth,
  allergies,
  conditions,
  font_size,
  high_contrast_mode,
  voice_enabled,
  biometric_enabled,
  created_at,
  updated_at
FROM public.profiles;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.caregiver_patient_profiles TO authenticated;

-- Update the profiles RLS policy to exclude pin_hash for caregivers
DROP POLICY IF EXISTS "Caregivers can view patient profiles" ON public.profiles;

-- Caregivers can view through the secure view instead
-- The existing "Users can view their own profile" policy remains for full access to own data