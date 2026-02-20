-- Create the 'voice-notes' bucket
insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', true)
on conflict (id) do nothing;

-- Notification policies for the bucket
create policy "Voice Notes are Publicly Accessible"
on storage.objects for select
using ( bucket_id = 'voice-notes' );

create policy "Authenticated Users can Upload Voice Notes"
on storage.objects for insert
with check (
  bucket_id = 'voice-notes'
  and auth.role() = 'authenticated'
);

create policy "Users can delete their own voice notes"
on storage.objects for delete
using (
  bucket_id = 'voice-notes'
  and auth.uid() = owner
);
