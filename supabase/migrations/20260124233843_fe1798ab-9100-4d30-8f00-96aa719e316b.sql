-- Create user_rewards table for gamification
CREATE TABLE public.user_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coins INTEGER NOT NULL DEFAULT 0,
  available_spins INTEGER NOT NULL DEFAULT 1,
  total_spins_used INTEGER NOT NULL DEFAULT 0,
  streak_multiplier NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  streak_shield_active BOOLEAN NOT NULL DEFAULT false,
  streak_shield_expires_at TIMESTAMP WITH TIME ZONE,
  last_spin_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create badges table
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- Create spin history for tracking wins
CREATE TABLE public.spin_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  spin_result TEXT[] NOT NULL,
  prize_type TEXT NOT NULL,
  prize_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_rewards
CREATE POLICY "Users can view their own rewards"
  ON public.user_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rewards"
  ON public.user_rewards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rewards"
  ON public.user_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for user_badges
CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for spin_history
CREATE POLICY "Users can view their own spin history"
  ON public.spin_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spins"
  ON public.spin_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_rewards_updated_at
  BEFORE UPDATE ON public.user_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize rewards for new users (update existing trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
  
  INSERT INTO public.adherence_streaks (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_rewards (user_id, available_spins)
  VALUES (NEW.id, 1);
  
  RETURN NEW;
END;
$function$;