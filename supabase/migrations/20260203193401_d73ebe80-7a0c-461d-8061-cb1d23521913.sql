-- Create caregiver relationships table
CREATE TABLE public.caregiver_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  caregiver_id UUID NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'family',
  nickname TEXT,
  can_view_medications BOOLEAN DEFAULT true,
  can_view_schedule BOOLEAN DEFAULT true,
  can_view_adherence BOOLEAN DEFAULT true,
  can_receive_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(patient_id, caregiver_id)
);

-- Create caregiver invitations table
CREATE TABLE public.caregiver_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  invitee_email TEXT,
  relationship TEXT NOT NULL DEFAULT 'family',
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID
);

-- Enable RLS
ALTER TABLE public.caregiver_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for caregiver_relationships
CREATE POLICY "Patients can manage their caregiver relationships"
ON public.caregiver_relationships
FOR ALL
USING (auth.uid() = patient_id);

CREATE POLICY "Caregivers can view their relationships"
ON public.caregiver_relationships
FOR SELECT
USING (auth.uid() = caregiver_id);

CREATE POLICY "Caregivers can delete their own relationships"
ON public.caregiver_relationships
FOR DELETE
USING (auth.uid() = caregiver_id);

-- Policies for caregiver_invitations
CREATE POLICY "Patients can manage their invitations"
ON public.caregiver_invitations
FOR ALL
USING (auth.uid() = patient_id);

CREATE POLICY "Anyone can view invitations by code"
ON public.caregiver_invitations
FOR SELECT
USING (status = 'pending' AND expires_at > now());

CREATE POLICY "Authenticated users can accept invitations"
ON public.caregiver_invitations
FOR UPDATE
USING (status = 'pending' AND expires_at > now())
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to check if user is a caregiver for a patient
CREATE OR REPLACE FUNCTION public.is_caregiver_for(patient_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.caregiver_relationships
    WHERE patient_id = patient_user_id
      AND caregiver_id = auth.uid()
  )
$$;

-- Add RLS policies to allow caregivers to view patient data
CREATE POLICY "Caregivers can view patient medications"
ON public.medications
FOR SELECT
USING (public.is_caregiver_for(user_id));

CREATE POLICY "Caregivers can view patient scheduled doses"
ON public.scheduled_doses
FOR SELECT
USING (public.is_caregiver_for(user_id));

CREATE POLICY "Caregivers can view patient dose logs"
ON public.dose_logs
FOR SELECT
USING (public.is_caregiver_for(user_id));

CREATE POLICY "Caregivers can view patient adherence"
ON public.adherence_streaks
FOR SELECT
USING (public.is_caregiver_for(user_id));

CREATE POLICY "Caregivers can view patient profiles"
ON public.profiles
FOR SELECT
USING (public.is_caregiver_for(user_id));

-- Trigger for updated_at
CREATE TRIGGER update_caregiver_relationships_updated_at
BEFORE UPDATE ON public.caregiver_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();