-- FIX RLS POLICIES (UPDATED)
-- Run this in your Supabase SQL Editor

-- 1. PROFILES: Allow users to insert their *own* profile
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check ( auth.uid() = id );

-- 2. COUPLES: Allow authenticated users to create a couple
drop policy if exists "Users can create couples" on public.couples;
create policy "Users can create couples"
on public.couples
for insert
with check ( auth.role() = 'authenticated' );

-- 3. COUPLES: Allow users to update a couple if they are one of the partners
-- This is needed for the second partner to "join" (update partner_b)
drop policy if exists "Partners can update their couple" on public.couples;
create policy "Partners can update their couple"
on public.couples
for update
using ( auth.uid() = partner_a or auth.uid() = partner_b or partner_b is null );

-- 4. COUPLES (CRITICAL): Allow ALL authenticated users to SELECT couples
-- This is required so Partner B can "find" the couple using the code.
-- The previous policy restricted it to partners only, so Partner B couldn't see it to join it.
drop policy if exists "Couples viewable by partners" on public.couples;
create policy "Couples viewable by authenticated users"
on public.couples for select 
using ( auth.role() = 'authenticated' );

-- 5. PUBLIC PROFILES
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" 
on public.profiles for select using ( true );
