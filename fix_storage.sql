-- Forcefully fix the 'voice-notes' bucket setup

-- 1. Ensure Bucket Exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-notes', 
  'voice-notes', 
  true, 
  10485760, -- 10MB limit
  '{audio/webm,audio/mpeg,audio/wav,audio/mp4,audio/ogg}' -- Allowed types
)
on conflict (id) do update set 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = '{audio/webm,audio/mpeg,audio/wav,audio/mp4,audio/ogg}';

-- 2. Drop existing policies to avoid "policy already exists" errors
drop policy if exists "Voice Notes are Publicly Accessible" on storage.objects;
drop policy if exists "Authenticated Users can Upload Voice Notes" on storage.objects;
drop policy if exists "Users can delete their own voice notes" on storage.objects;
-- (Also dropping common variations just in case)
drop policy if exists "Public Read" on storage.objects;
drop policy if exists "Auth Upload" on storage.objects;

-- 3. Re-create Policies

-- Allow anyone to read (play) the voice notes
create policy "Voice Notes are Publicly Accessible"
on storage.objects for select
using ( bucket_id = 'voice-notes' );

-- Allow authenticated users to upload
create policy "Authenticated Users can Upload Voice Notes"
on storage.objects for insert
with check (
  bucket_id = 'voice-notes'
  and auth.role() = 'authenticated'
);

-- Allow users to update/delete their own files
create policy "Users can delete their own voice notes"
on storage.objects for delete
using (
  bucket_id = 'voice-notes'
  and auth.uid() = owner
);

-- Grant usage (sometimes needed depending on setup)
grant all on table storage.objects to postgres;
grant all on table storage.buckets to postgres;
grant all on table storage.objects to authenticated;
grant all on table storage.buckets to authenticated;
grant all on table storage.objects to service_role;
grant all on table storage.buckets to service_role;
