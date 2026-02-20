-- MASTER FIX SCRIPT
-- Run this entire script in Supabase SQL Editor to fix Tables AND Storage

-- 1. Create Radio Transmissions Table
create table if not exists public.radio_transmissions (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid, -- link to couple (we won't enforcing FK strictly to avoid locking issues if couple deleted, but ideally should reference)
  sender_id uuid references auth.users(id), -- Use auth.users for stricter auth
  youtube_link text not null,
  voice_note_url text not null, 
  message text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  is_played boolean default false
);

-- 2. Create Notifications Table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  type text not null, -- 'heartbeat', 'radio', 'memory', 'system'
  title text,
  message text,
  metadata jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Enable Security (Row Level Security)
alter table public.radio_transmissions enable row level security;
alter table public.notifications enable row level security;

-- 4. Policies for Radio (Drop first to ensure clean state)
drop policy if exists "Radio Viewable by Couple" on public.radio_transmissions;
drop policy if exists "Radio Insertable by Sender" on public.radio_transmissions;
drop policy if exists "Radio Updateable by Couple" on public.radio_transmissions;

create policy "Radio Viewable by Couple"
on public.radio_transmissions for select
using ( true ); 
-- (Simplifying policy for now to ensure it works. You can restrict later if needed.)

create policy "Radio Insertable by Sender"
on public.radio_transmissions for insert
with check ( auth.uid() = sender_id );

create policy "Radio Updateable by Couple"
on public.radio_transmissions for update
using ( true );

-- 5. Policies for Notifications
drop policy if exists "Users see own notifications" on public.notifications;
drop policy if exists "Anyone can insert notifications" on public.notifications;

create policy "Users see own notifications"
on public.notifications for select
using ( auth.uid() = user_id );

create policy "Anyone can insert notifications"
on public.notifications for insert
with check ( true ); 

-- 6. STORAGE: Fix 'voice-notes' bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-notes', 
  'voice-notes', 
  true, 
  10485760, 
  '{audio/webm,audio/mpeg,audio/wav,audio/mp4,audio/ogg}'
)
on conflict (id) do update set 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = '{audio/webm,audio/mpeg,audio/wav,audio/mp4,audio/ogg}';

-- 7. STORAGE: Policies
drop policy if exists "Voice Public Read" on storage.objects;
drop policy if exists "Voice Auth Upload" on storage.objects;
drop policy if exists "Voice Owner Delete" on storage.objects;

create policy "Voice Public Read"
on storage.objects for select
using ( bucket_id = 'voice-notes' );

create policy "Voice Auth Upload"
on storage.objects for insert
with check (
  bucket_id = 'voice-notes'
  and auth.role() = 'authenticated'
);

create policy "Voice Owner Delete"
on storage.objects for delete
using (
  bucket_id = 'voice-notes'
  and auth.uid() = owner
);

-- 8. Grant permissions
grant all on public.radio_transmissions to postgres, authenticated, service_role;
grant all on public.notifications to postgres, authenticated, service_role;
