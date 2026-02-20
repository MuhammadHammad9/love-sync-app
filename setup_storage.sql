-- 1. Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 2. Enable RLS (Should be on by default, but good to ensure)
alter table storage.objects enable row level security;

-- 3. Policy: Allow Public Read (Anyone can view avatars)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- 4. Policy: Allow Authenticated Users to Upload (Insert)
create policy "Authenticated Upload"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
  );

-- 5. Policy: Allow Users to Update/Delete their own files
create policy "User Update Own"
  on storage.objects for update
  using (
    bucket_id = 'avatars' 
    and auth.uid() = owner
  );

create policy "User Delete Own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars' 
    and auth.uid() = owner
  );
