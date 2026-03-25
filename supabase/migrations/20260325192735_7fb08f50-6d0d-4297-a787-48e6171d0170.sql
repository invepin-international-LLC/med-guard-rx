-- Add user_preferences initialization to the handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
  
  INSERT INTO public.adherence_streaks (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_rewards (user_id, available_spins)
  VALUES (NEW.id, 1);

  INSERT INTO public.user_preferences (user_id, equipped_theme, equipped_avatar)
  VALUES (NEW.id, 'default', 'default');
  
  RETURN NEW;
END;
$$;