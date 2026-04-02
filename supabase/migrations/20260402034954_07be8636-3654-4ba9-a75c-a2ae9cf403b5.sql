
-- Create per-table caregiver check functions that respect permission flags

CREATE OR REPLACE FUNCTION public.is_caregiver_for_medications(patient_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.caregiver_relationships
    WHERE patient_id = patient_user_id
      AND caregiver_id = auth.uid()
      AND can_view_medications = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_caregiver_for_schedule(patient_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.caregiver_relationships
    WHERE patient_id = patient_user_id
      AND caregiver_id = auth.uid()
      AND can_view_schedule = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_caregiver_for_adherence(patient_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.caregiver_relationships
    WHERE patient_id = patient_user_id
      AND caregiver_id = auth.uid()
      AND can_view_adherence = true
  )
$$;

-- Update medications caregiver policy
DROP POLICY IF EXISTS "Caregivers can view patient medications" ON public.medications;
CREATE POLICY "Caregivers can view patient medications"
ON public.medications
FOR SELECT
USING (is_caregiver_for_medications(user_id));

-- Update scheduled_doses caregiver policy
DROP POLICY IF EXISTS "Caregivers can view patient scheduled doses" ON public.scheduled_doses;
CREATE POLICY "Caregivers can view patient scheduled doses"
ON public.scheduled_doses
FOR SELECT
USING (is_caregiver_for_schedule(user_id));

-- Update dose_logs caregiver policy
DROP POLICY IF EXISTS "Caregivers can view patient dose logs" ON public.dose_logs;
CREATE POLICY "Caregivers can view patient dose logs"
ON public.dose_logs
FOR SELECT
USING (is_caregiver_for_adherence(user_id));

-- Update adherence_streaks caregiver policy
DROP POLICY IF EXISTS "Caregivers can view patient adherence" ON public.adherence_streaks;
CREATE POLICY "Caregivers can view patient adherence"
ON public.adherence_streaks
FOR SELECT
USING (is_caregiver_for_adherence(user_id));
