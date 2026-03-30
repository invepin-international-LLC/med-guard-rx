
-- Appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Doctor Appointment',
  doctor_name TEXT,
  appointment_date TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'recording',
  raw_transcript TEXT,
  plain_summary TEXT,
  follow_up_flags JSONB DEFAULT '[]'::jsonb,
  medication_mentions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own appointments"
  ON public.appointments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pre-loaded questions for appointments
CREATE TABLE public.appointment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  was_addressed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own appointment questions"
  ON public.appointment_questions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
