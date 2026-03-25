-- Block all direct client inserts on tables now managed by SECURITY DEFINER functions.
-- The server-side functions bypass RLS, so they still work.

-- user_rewards: no direct INSERT/UPDATE from clients
CREATE POLICY "Block direct user_rewards inserts"
ON public.user_rewards FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct user_rewards updates"
ON public.user_rewards FOR UPDATE
USING (false);

-- user_badges: no direct INSERT from clients
CREATE POLICY "Block direct user_badges inserts"
ON public.user_badges FOR INSERT
WITH CHECK (false);

-- spin_history: no direct INSERT from clients
CREATE POLICY "Block direct spin_history inserts"
ON public.spin_history FOR INSERT
WITH CHECK (false);

-- user_inventory: no direct INSERT from clients (purchases go through purchase_shop_item RPC)
CREATE POLICY "Block direct user_inventory inserts"
ON public.user_inventory FOR INSERT
WITH CHECK (false);

-- Tighten the caregiver invitation acceptance WITH CHECK
DROP POLICY IF EXISTS "Invitees can accept their invitations" ON public.caregiver_invitations;

CREATE POLICY "Invitees can accept their invitations"
ON public.caregiver_invitations
FOR UPDATE
USING (
  (status = 'pending')
  AND (expires_at > now())
  AND (invitee_email = (auth.jwt() ->> 'email'::text))
)
WITH CHECK (
  (invitee_email = (auth.jwt() ->> 'email'::text))
  AND (accepted_by = auth.uid())
);