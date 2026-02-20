-- ============================================================
-- LoveSync — Database Fixes
-- Run these in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ALLOW USERS TO DELETE THEIR OWN PROFILE (RLS policy)
--    This is what's blocking account deletion.
-- ────────────────────────────────────────────────────────────
create policy "Users can delete their own profile"
  on profiles for delete
  using (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- 2. ALLOW USERS TO DELETE THEIR OWN NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
create policy "Users can delete their own notifications"
  on notifications for delete
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 3. ALLOW USERS TO UPDATE THE COUPLE RECORD THEY BELONG TO
--    (needed to detach from couple on account deletion)
-- ────────────────────────────────────────────────────────────
create policy "Users can update their couple record"
  on couples for update
  using (
    auth.uid() = partner_a
    or auth.uid() = partner_b
  );

-- ────────────────────────────────────────────────────────────
-- 4. HUMAN-READABLE COUPLE VIEW
--    Lets you see "who is paired with whom" in the dashboard
--    instead of raw UUIDs.
-- ────────────────────────────────────────────────────────────
create or replace view couple_details as
select
  c.id              as couple_id,
  c.connect_code,
  c.streak_count,
  c.created_at,
  pa.id             as partner_a_id,
  pa.username       as partner_a_username,
  pa.avatar_url     as partner_a_avatar,
  pb.id             as partner_b_id,
  pb.username       as partner_b_username,
  pb.avatar_url     as partner_b_avatar
from couples c
left join profiles pa on pa.id = c.partner_a
left join profiles pb on pb.id = c.partner_b;
