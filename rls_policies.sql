-- RLS Policies for LoveSync App

-- 1. Profiles
-- Everyone can read profiles (needed for partner search/connection)
create policy "Public profiles are viewable by everyone"
on profiles for select
using ( true );

-- Users can update their own profile
create policy "Users can update own profile"
on profiles for update
using ( auth.uid() = id );

-- Users can insert their own profile
create policy "Users can insert own profile"
on profiles for insert
with check ( auth.uid() = id );

-- 2. Couples
-- Users can view their own couple data
create policy "Couples viewable by partners"
on couples for select
using ( auth.uid() = partner_a or auth.uid() = partner_b );

-- Users can create a couple
create policy "Authenticated users can create couples"
on couples for insert
with check ( auth.role() = 'authenticated' );

-- Partners can update their couple data
create policy "Partners can update couple"
on couples for update
using ( auth.uid() = partner_a or auth.uid() = partner_b );

-- 3. Daily Prompts
-- Viewable by couple partners
create policy "Prompts viewable by couple"
on daily_prompts for select
using ( 
    auth.uid() in (
        select partner_a from couples where id = daily_prompts.couple_id
        union
        select partner_b from couples where id = daily_prompts.couple_id
    )
);

-- Insertable by system or partners (if manually triggering)
create policy "Partners can create prompts"
on daily_prompts for insert
with check (
    auth.uid() in (
        select partner_a from couples where id = couple_id
        union
        select partner_b from couples where id = couple_id
    )
);

-- Update answers (user can update if they belong to the couple)
create policy "Partners can update prompts"
on daily_prompts for update
using (
    auth.uid() in (
        select partner_a from couples where id = daily_prompts.couple_id
        union
        select partner_b from couples where id = daily_prompts.couple_id
    )
);

-- 4. Memories
create policy "Memories viewable by couple"
on memories for select
using (
    exists (
        select 1 from couples
        where id = memories.couple_id
        and (partner_a = auth.uid() or partner_b = auth.uid())
    )
);

create policy "Partners can upload memories"
on memories for insert
with check (
    exists (
        select 1 from couples
        where id = couple_id
        and (partner_a = auth.uid() or partner_b = auth.uid())
    )
);

create policy "Uploader can delete memories"
on memories for delete
using ( uploader_id = auth.uid() );

-- 5. Notifications
create policy "Users can view own notifications"
on notifications for select
using ( user_id = auth.uid() );

create policy "System/Users can insert notifications"
on notifications for insert
with check ( true ); -- Ideally limited to system or triggered via functions, but loose for now for peer-to-peer

create policy "Users can update own notifications"
on notifications for update
using ( user_id = auth.uid() );

-- 6. Radio Transmissions (Loose coupling)
create policy "Radio viewable by recipient or couple"
on radio_transmissions for select
using (
    created_at > now() - interval '24 hours' -- Only active ones?
    or sender_id = auth.uid()
);

create policy "Authenticated users can send radio"
on radio_transmissions for insert
with check ( auth.role() = 'authenticated' );

-- 7. Game History
create policy "Game history viewable by couple"
on game_history for select
using (
    exists (
        select 1 from couples
        where id = game_history.couple_id
        and (partner_a = auth.uid() or partner_b = auth.uid())
    )
);

create policy "Partners can record game history"
on game_history for insert
with check (
    exists (
        select 1 from couples
        where id = couple_id
        and (partner_a = auth.uid() or partner_b = auth.uid())
    )
);

-- 8. Sleep Sessions
create policy "Sleep sessions viewable by couple"
on sleep_sessions for select
using (
    exists (
        select 1 from couples
        where id = sleep_sessions.couple_id
        and (partner_a = auth.uid() or partner_b = auth.uid())
    )
);

create policy "Users can record sleep"
on sleep_sessions for insert
with check ( user_id = auth.uid() );

