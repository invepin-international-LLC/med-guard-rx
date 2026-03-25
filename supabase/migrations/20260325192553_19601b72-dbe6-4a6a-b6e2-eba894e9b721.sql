-- ============================================================
-- Server-side SECURITY DEFINER functions for rewards system
-- ============================================================

-- 1. Award spins (increment only, never set arbitrary values)
CREATE OR REPLACE FUNCTION public.award_spins(_spins integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _spins <= 0 OR _spins > 10 THEN
    RAISE EXCEPTION 'Invalid spin count: must be 1-10';
  END IF;
  
  UPDATE user_rewards
  SET available_spins = available_spins + _spins,
      updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;

-- 2. Record a spin and apply prizes atomically
CREATE OR REPLACE FUNCTION public.record_spin(
  _symbols text[],
  _prize_type text,
  _prize_value integer,
  _new_multiplier numeric DEFAULT NULL,
  _shield_hours integer DEFAULT NULL,
  _bonus_spins integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_record user_rewards%ROWTYPE;
  _final_coins integer;
  _final_spins integer;
  _result json;
BEGIN
  -- Get current rewards with row lock
  SELECT * INTO _current_record
  FROM user_rewards
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No rewards record found';
  END IF;

  IF _current_record.available_spins <= 0 THEN
    RAISE EXCEPTION 'No spins available';
  END IF;

  -- Validate prize type
  IF _prize_type NOT IN ('coins', 'multiplier', 'shield', 'badge', 'bonus_spin', 'jackpot') THEN
    RAISE EXCEPTION 'Invalid prize type';
  END IF;

  -- Calculate new values
  _final_coins := _current_record.coins;
  _final_spins := _current_record.available_spins - 1 + _bonus_spins;

  IF _prize_type IN ('coins', 'jackpot') THEN
    _final_coins := _current_record.coins + _prize_value;
  END IF;

  -- Update rewards atomically
  UPDATE user_rewards
  SET coins = _final_coins,
      available_spins = _final_spins,
      total_spins_used = _current_record.total_spins_used + 1,
      streak_multiplier = COALESCE(_new_multiplier, streak_multiplier),
      streak_shield_active = CASE WHEN _shield_hours IS NOT NULL THEN true ELSE streak_shield_active END,
      streak_shield_expires_at = CASE WHEN _shield_hours IS NOT NULL THEN now() + (_shield_hours || ' hours')::interval ELSE streak_shield_expires_at END,
      last_spin_date = CURRENT_DATE,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Record spin history
  INSERT INTO spin_history (user_id, spin_result, prize_type, prize_value)
  VALUES (_user_id, _symbols, _prize_type, _prize_value);

  _result := json_build_object(
    'coins', _final_coins,
    'available_spins', _final_spins,
    'total_spins_used', _current_record.total_spins_used + 1
  );

  RETURN _result;
END;
$$;

-- 3. Award a badge (with duplicate check)
CREATE OR REPLACE FUNCTION public.award_badge(
  _badge_type text,
  _badge_name text,
  _badge_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _new_badge user_badges%ROWTYPE;
BEGIN
  -- Check if badge already exists
  IF EXISTS (
    SELECT 1 FROM user_badges
    WHERE user_id = _user_id AND badge_type = _badge_type
  ) THEN
    RETURN json_build_object('already_exists', true);
  END IF;

  INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
  VALUES (_user_id, _badge_type, _badge_name, _badge_description)
  RETURNING * INTO _new_badge;

  RETURN json_build_object(
    'already_exists', false,
    'id', _new_badge.id,
    'badge_type', _new_badge.badge_type,
    'badge_name', _new_badge.badge_name,
    'badge_description', _new_badge.badge_description,
    'earned_at', _new_badge.earned_at
  );
END;
$$;

-- 4. Purchase a shop item (atomic coin deduction + inventory add)
CREATE OR REPLACE FUNCTION public.purchase_shop_item(
  _item_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _item shop_items%ROWTYPE;
  _current_coins integer;
  _expires_at timestamptz;
BEGIN
  -- Get item details
  SELECT * INTO _item FROM shop_items WHERE id = _item_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found or inactive';
  END IF;

  -- Get current coins with lock
  SELECT coins INTO _current_coins
  FROM user_rewards
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No rewards record found';
  END IF;

  IF _current_coins < _item.price THEN
    RAISE EXCEPTION 'Not enough coins';
  END IF;

  -- For permanent items, check if already owned
  IF _item.duration_hours IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM user_inventory ui
      JOIN shop_items si ON si.id = ui.item_id
      WHERE ui.user_id = _user_id
        AND si.item_type = _item.item_type
        AND (ui.expires_at IS NULL OR ui.expires_at > now())
    ) THEN
      RAISE EXCEPTION 'Item already owned';
    END IF;
  END IF;

  -- Deduct coins
  UPDATE user_rewards
  SET coins = coins - _item.price, updated_at = now()
  WHERE user_id = _user_id;

  -- Calculate expiration
  IF _item.duration_hours IS NOT NULL THEN
    _expires_at := now() + (_item.duration_hours || ' hours')::interval;
  END IF;

  -- Add to inventory
  INSERT INTO user_inventory (user_id, item_id, expires_at)
  VALUES (_user_id, _item_id, _expires_at);

  -- Handle power-ups
  IF _item.category = 'powerup' THEN
    IF _item.item_type LIKE 'shield_%' THEN
      UPDATE user_rewards
      SET streak_shield_active = true,
          streak_shield_expires_at = now() + (COALESCE(_item.duration_hours, 24) || ' hours')::interval,
          updated_at = now()
      WHERE user_id = _user_id;
    ELSIF _item.item_type = 'triple_spins' THEN
      UPDATE user_rewards
      SET available_spins = available_spins + 3, updated_at = now()
      WHERE user_id = _user_id;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'new_coins', _current_coins - _item.price,
    'item_name', _item.name,
    'expires_at', _expires_at
  );
END;
$$;

-- ============================================================
-- Tighten RLS policies: remove direct client INSERT/UPDATE
-- ============================================================

-- user_badges: Remove direct INSERT (now handled by award_badge function)
DROP POLICY IF EXISTS "Users can insert their own badges" ON public.user_badges;

-- user_rewards: Remove direct INSERT policy (handled by handle_new_user trigger)
DROP POLICY IF EXISTS "Users can insert their own rewards" ON public.user_rewards;

-- user_rewards: Remove direct UPDATE policy (now handled by server functions)
DROP POLICY IF EXISTS "Users can update their own rewards" ON public.user_rewards;

-- spin_history: Remove direct INSERT (now handled by record_spin function)
DROP POLICY IF EXISTS "Users can insert their own spins" ON public.spin_history;

-- user_inventory: Remove direct INSERT (now handled by purchase_shop_item function)
DROP POLICY IF EXISTS "Users can insert their own inventory" ON public.user_inventory;