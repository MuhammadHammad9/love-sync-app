-- FIX PROMPTS RLS
-- Run this in Supabase SQL Editor

-- Enable RLS
alter table public.daily_prompts enable row level security;

-- 1. SELECT: Allow partners to see prompts for their couple
create policy "Partners can view their prompts"
on public.daily_prompts
for select
using (
  exists (
    select 1 from public.couples c
    where c.id = daily_prompts.couple_id
    and (c.partner_a = auth.uid() or c.partner_b = auth.uid())
  )
);

-- 2. INSERT: Allow authenticated users to create a prompt (for "today")
create policy "Users can insert prompts"
on public.daily_prompts
for insert
with check ( auth.role() = 'authenticated' );

-- 3. UPDATE: Allow partners to answer (update their specific field)
create policy "Partners can answer prompts"
on public.daily_prompts
for update
using (
  exists (
    select 1 from public.couples c
    where c.id = daily_prompts.couple_id
    and (c.partner_a = auth.uid() or c.partner_b = auth.uid())
  )
);
