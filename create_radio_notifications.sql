-- 1. Radio / Telepathic DJ Transmissions
create table public.radio_transmissions (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid references public.couples(id),
  sender_id uuid references public.profiles(id),
  youtube_link text not null,
  voice_note_url text not null, -- URL to Supabase Storage
  message text, -- optional text note
  created_at timestamp with time zone default timezone('utc'::text, now()),
  is_played boolean default false
);

-- RLS
alter table public.radio_transmissions enable row level security;

create policy "Couples can see their own transmissions"
on public.radio_transmissions for select
using ( 
  couple_id in (
    select id from public.couples 
    where partner_a = auth.uid() or partner_b = auth.uid()
  )
);

create policy "Users can insert transmissions for their couple"
on public.radio_transmissions for insert
with check (
  couple_id in (
    select id from public.couples 
    where partner_a = auth.uid() or partner_b = auth.uid()
  )
);

create policy "Users can update played status"
on public.radio_transmissions for update
using (
  couple_id in (
    select id from public.couples 
    where partner_a = auth.uid() or partner_b = auth.uid()
  )
);


-- 2. System Notifications
-- A generic table to store persistent notifications so users see them even if they were offline
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id), -- The recipient
  type text not null, -- 'heartbeat', 'radio', 'memory', 'system'
  title text,
  message text,
  metadata jsonb, -- e.g. { sender_id: '...', link: '...' }
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS
alter table public.notifications enable row level security;

create policy "Users can see their own notifications"
on public.notifications for select
using ( auth.uid() = user_id );

create policy "System/Partners can insert notifications"
on public.notifications for insert
with check ( true ); -- We allow insert, logic handles targeting via user_id

create policy "Users can update their own notifications"
on public.notifications for update
using ( auth.uid() = user_id );
