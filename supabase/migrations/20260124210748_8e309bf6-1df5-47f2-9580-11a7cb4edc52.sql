-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date_of_birth DATE,
  pin_hash TEXT,
  biometric_enabled BOOLEAN DEFAULT false,
  voice_enabled BOOLEAN DEFAULT true,
  high_contrast_mode BOOLEAN DEFAULT true,
  font_size TEXT DEFAULT 'large' CHECK (font_size IN ('normal', 'large', 'extra-large')),
  allergies TEXT[] DEFAULT '{}',
  conditions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergency contacts table
CREATE TABLE public.emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  is_caregiver BOOLEAN DEFAULT false,
  notify_on_missed_dose BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pharmacies table
CREATE TABLE public.pharmacies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  is_primary BOOLEAN DEFAULT false,
  place_id TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medications table
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generic_name TEXT,
  strength TEXT NOT NULL,
  form TEXT NOT NULL CHECK (form IN ('pill', 'capsule', 'liquid', 'injection', 'patch', 'inhaler', 'drops', 'cream', 'other')),
  color TEXT,
  imprint TEXT,
  shape TEXT,
  ndc_code TEXT,
  rxcui TEXT,
  purpose TEXT,
  how_it_works TEXT,
  instructions TEXT,
  side_effects TEXT[] DEFAULT '{}',
  important_warnings TEXT[] DEFAULT '{}',
  drug_class TEXT,
  refill_date DATE,
  quantity_remaining INTEGER,
  prescriber TEXT,
  pharmacy_id UUID REFERENCES public.pharmacies(id),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled doses table
CREATE TABLE public.scheduled_doses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_time TIME NOT NULL,
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'bedtime')),
  days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dose logs table for tracking taken/skipped/missed doses
CREATE TABLE public.dose_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_dose_id UUID NOT NULL REFERENCES public.scheduled_doses(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'taken', 'skipped', 'snoozed', 'missed')) DEFAULT 'pending',
  action_at TIMESTAMP WITH TIME ZONE,
  snoozed_until TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create drug interactions table
CREATE TABLE public.drug_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id_1 UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  medication_id_2 UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'major', 'contraindicated')),
  description TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(medication_id_1, medication_id_2)
);

-- Create adherence streaks table
CREATE TABLE public.adherence_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_taken_date DATE,
  weekly_adherence DECIMAL(5,2) DEFAULT 0,
  monthly_adherence DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create caregiver notifications log
CREATE TABLE public.caregiver_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.emergency_contacts(id) ON DELETE CASCADE,
  dose_log_id UUID REFERENCES public.dose_logs(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('missed_dose', 'low_adherence', 'refill_needed', 'emergency')),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'push')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'delivered')) DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_doses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adherence_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for emergency_contacts
CREATE POLICY "Users can manage their emergency contacts" ON public.emergency_contacts
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for pharmacies
CREATE POLICY "Users can manage their pharmacies" ON public.pharmacies
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for medications
CREATE POLICY "Users can manage their medications" ON public.medications
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for scheduled_doses
CREATE POLICY "Users can manage their scheduled doses" ON public.scheduled_doses
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for dose_logs
CREATE POLICY "Users can manage their dose logs" ON public.dose_logs
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for drug_interactions
CREATE POLICY "Users can view their drug interactions" ON public.drug_interactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.medications WHERE id = medication_id_1 AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.medications WHERE id = medication_id_2 AND user_id = auth.uid())
  );

-- RLS Policies for adherence_streaks
CREATE POLICY "Users can manage their adherence streaks" ON public.adherence_streaks
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for caregiver_notifications
CREATE POLICY "Users can view their caregiver notifications" ON public.caregiver_notifications
  FOR ALL USING (auth.uid() = user_id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
  
  INSERT INTO public.adherence_streaks (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dose_logs_updated_at BEFORE UPDATE ON public.dose_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_adherence_streaks_updated_at BEFORE UPDATE ON public.adherence_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();