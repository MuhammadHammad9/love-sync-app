-- COMPREHENSIVE FIX for User Deletion (Cascading Deletes)
-- Run this script in your Supabase SQL Editor

-- 1. Update Profiles -> auth.users
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Update Couples -> Profiles
ALTER TABLE public.couples
  DROP CONSTRAINT IF EXISTS couples_partner_a_fkey,
  ADD CONSTRAINT couples_partner_a_fkey FOREIGN KEY (partner_a) REFERENCES public.profiles(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS couples_partner_b_fkey,
  ADD CONSTRAINT couples_partner_b_fkey FOREIGN KEY (partner_b) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Update Profiles -> Couples (Circular Reference)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_couple_id_fkey,
  ADD CONSTRAINT profiles_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE SET NULL;

-- 4. Update Heartbeats
ALTER TABLE public.heartbeats
  DROP CONSTRAINT IF EXISTS heartbeats_couple_id_fkey,
  ADD CONSTRAINT heartbeats_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS heartbeats_sender_id_fkey,
  ADD CONSTRAINT heartbeats_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. Update Daily Prompts
ALTER TABLE public.daily_prompts
  DROP CONSTRAINT IF EXISTS daily_prompts_couple_id_fkey,
  ADD CONSTRAINT daily_prompts_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE;

-- 6. Update Memories (Photos)
ALTER TABLE public.memories
  DROP CONSTRAINT IF EXISTS memories_couple_id_fkey,
  ADD CONSTRAINT memories_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS memories_uploaded_by_fkey,
  ADD CONSTRAINT memories_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 7. Update Game History
ALTER TABLE public.game_history
  DROP CONSTRAINT IF EXISTS game_history_couple_id_fkey,
  ADD CONSTRAINT game_history_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS game_history_winner_id_fkey,
  ADD CONSTRAINT game_history_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 8. Update Radio Transmissions
ALTER TABLE public.radio_transmissions
  DROP CONSTRAINT IF EXISTS radio_transmissions_sender_id_fkey,
  ADD CONSTRAINT radio_transmissions_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 9. Update Notifications
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey,
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 10. Update Sleep Sessions
ALTER TABLE public.sleep_sessions
  DROP CONSTRAINT IF EXISTS sleep_sessions_user_id_fkey,
  ADD CONSTRAINT sleep_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS sleep_sessions_couple_id_fkey,
  ADD CONSTRAINT sleep_sessions_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE;
  
-- 11. Update Alarm Settings
ALTER TABLE public.alarm_settings
  DROP CONSTRAINT IF EXISTS alarm_settings_user_id_fkey,
  ADD CONSTRAINT alarm_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 12. Update Hidden Events
ALTER TABLE public.hidden_events
  DROP CONSTRAINT IF EXISTS hidden_events_couple_id_fkey,
  ADD CONSTRAINT hidden_events_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS hidden_events_creator_id_fkey,
  ADD CONSTRAINT hidden_events_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  
-- 13. Update Daily Notes
ALTER TABLE public.daily_notes
  DROP CONSTRAINT IF EXISTS daily_notes_couple_id_fkey,
  ADD CONSTRAINT daily_notes_couple_id_fkey FOREIGN KEY (couple_id) REFERENCES public.couples(id) ON DELETE CASCADE;
