alter table public.notices
add column content_blocks jsonb not null default '[]'::jsonb
check (jsonb_typeof(content_blocks) = 'array');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notice-images',
  'notice-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads notice images" on storage.objects
for select using (bucket_id = 'notice-images');

create policy "admins upload notice images" on storage.objects
for insert to authenticated
with check (bucket_id = 'notice-images' and public.is_admin());

create policy "admins update notice images" on storage.objects
for update to authenticated
using (bucket_id = 'notice-images' and public.is_admin())
with check (bucket_id = 'notice-images' and public.is_admin());

create policy "admins delete notice images" on storage.objects
for delete to authenticated
using (bucket_id = 'notice-images' and public.is_admin());
