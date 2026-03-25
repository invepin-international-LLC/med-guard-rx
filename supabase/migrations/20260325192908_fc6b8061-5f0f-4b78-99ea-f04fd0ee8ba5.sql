-- Fix 1: user_challenges - create server-side function for challenge completion
-- Remove direct UPDATE policy and replace with restricted one
DROP POLICY IF EXISTS "Users can update their own challenge progress" ON public.user_challenges;
DROP POLICY IF EXISTS "Users can insert their own challenge progress" ON public.user_challenges;

-- Block direct inserts (should go through server function)
CREATE POLICY "Block direct challenge inserts"
ON public.user_challenges FOR INSERT
WITH CHECK (false);

-- Block direct updates (should go through server function)
CREATE POLICY "Block direct challenge updates"
ON public.user_challenges FOR UPDATE
USING (false);

-- Server-side function to increment challenge progress
CREATE OR REPLACE FUNCTION public.increment_challenge_progress(
  _challenge_id uuid,
  _week_start date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _record user_challenges%ROWTYPE;
  _challenge weekly_challenges%ROWTYPE;
BEGIN
  -- Get or create the user challenge record
  SELECT * INTO _record
  FROM user_challenges
  WHERE user_id = _user_id AND challenge_id = _challenge_id AND week_start = _week_start
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO user_challenges (user_id, challenge_id, week_start)
    VALUES (_user_id, _challenge_id, _week_start)
    RETURNING * INTO _record;
  END IF;

  IF _record.is_completed THEN
    RETURN json_build_object('already_completed', true);
  END IF;

  -- Get challenge target
  SELECT * INTO _challenge FROM weekly_challenges WHERE id = _challenge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  -- Increment progress
  UPDATE user_challenges
  SET current_progress = current_progress + 1,
      is_completed = (current_progress + 1 >= _challenge.target_count),
      completed_at = CASE WHEN current_progress + 1 >= _challenge.target_count THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = _record.id;

  RETURN json_build_object(
    'new_progress', _record.current_progress + 1,
    'is_completed', (_record.current_progress + 1 >= _challenge.target_count),
    'target', _challenge.target_count
  );
END;
$$;

-- Server-side function to claim challenge reward
CREATE OR REPLACE FUNCTION public.claim_challenge_reward(
  _user_challenge_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _uc user_challenges%ROWTYPE;
  _challenge weekly_challenges%ROWTYPE;
BEGIN
  SELECT * INTO _uc
  FROM user_challenges
  WHERE id = _user_challenge_id AND user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge record not found';
  END IF;

  IF NOT _uc.is_completed THEN
    RAISE EXCEPTION 'Challenge not completed';
  END IF;

  IF _uc.reward_claimed THEN
    RAISE EXCEPTION 'Reward already claimed';
  END IF;

  SELECT * INTO _challenge FROM weekly_challenges WHERE id = _uc.challenge_id;

  -- Mark as claimed
  UPDATE user_challenges SET reward_claimed = true, updated_at = now()
  WHERE id = _user_challenge_id;

  -- Award coins and spins
  UPDATE user_rewards
  SET coins = coins + _challenge.reward_coins,
      available_spins = available_spins + _challenge.reward_spins,
      updated_at = now()
  WHERE user_id = _user_id;

  RETURN json_build_object(
    'coins_awarded', _challenge.reward_coins,
    'spins_awarded', _challenge.reward_spins
  );
END;
$$;

-- Fix 2: Restrict user_inventory UPDATE to only is_equipped column
DROP POLICY IF EXISTS "Users can update their own inventory" ON public.user_inventory;

CREATE POLICY "Users can update is_equipped only"
ON public.user_inventory FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);