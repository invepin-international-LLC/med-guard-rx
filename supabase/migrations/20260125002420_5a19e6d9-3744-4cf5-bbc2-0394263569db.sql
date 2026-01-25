-- Create weekly challenges table (predefined challenge templates)
CREATE TABLE public.weekly_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL, -- 'morning_streak', 'perfect_week', 'no_snooze', etc.
  target_count INTEGER NOT NULL DEFAULT 7,
  reward_coins INTEGER NOT NULL DEFAULT 50,
  reward_spins INTEGER NOT NULL DEFAULT 1,
  time_of_day TEXT, -- 'morning', 'afternoon', 'evening', null for any
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user challenge progress table
CREATE TABLE public.user_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  current_progress INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id, week_start)
);

-- Enable RLS
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;

-- RLS for weekly_challenges (public read)
CREATE POLICY "Anyone can view challenges"
ON public.weekly_challenges
FOR SELECT
USING (true);

-- RLS for user_challenges
CREATE POLICY "Users can view their own challenge progress"
ON public.user_challenges
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge progress"
ON public.user_challenges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge progress"
ON public.user_challenges
FOR UPDATE
USING (auth.uid() = user_id);

-- Insert default weekly challenges
INSERT INTO public.weekly_challenges (name, description, challenge_type, target_count, reward_coins, reward_spins, time_of_day) VALUES
('Morning Champion', 'Take all morning doses on time for 7 days', 'time_streak', 7, 100, 2, 'morning'),
('Afternoon Ace', 'Take all afternoon doses on time for 7 days', 'time_streak', 7, 100, 2, 'afternoon'),
('Evening Expert', 'Take all evening doses on time for 7 days', 'time_streak', 7, 100, 2, 'evening'),
('Perfect Week', 'Take every single dose on time for 7 days', 'perfect_week', 7, 200, 3, null),
('No Snooze Week', 'Take 14 doses without using snooze', 'no_snooze', 14, 75, 1, null),
('Early Bird', 'Take 10 doses within 5 minutes of scheduled time', 'early_dose', 10, 50, 1, null);

-- Add trigger for updated_at
CREATE TRIGGER update_user_challenges_updated_at
BEFORE UPDATE ON public.user_challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();