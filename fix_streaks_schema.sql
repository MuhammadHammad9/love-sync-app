-- FIX STREAKS SCHEMA
-- Run this in Supabase SQL Editor

-- 1. Add photo columns to daily_prompts
alter table public.daily_prompts 
add column if not exists photo_a text,
add column if not exists photo_b text;

-- 2. Add streak settings to couples
alter table public.couples 
add column if not exists streak_target integer default 30; -- For the "How long do you want to carry" goal

-- 3. Add stats columns to couples (if not present)
alter table public.couples 
add column if not exists photos_shared integer default 0,
add column if not exists questions_answered integer default 0;

-- 4. Enable RLS for updates on these new columns (covered by existing policy, but good to double check)
-- "Partners can update their couple" policy covers the new columns in `couples`.
-- "Partners can answer prompts" policy covers `photo_a/b` in `daily_prompts`.
