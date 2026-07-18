alter table public.campaigns
add column if not exists reference_image_urls text[] not null default '{}'::text[];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-images',
  'campaign-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read campaign images" on storage.objects;
create policy "public read campaign images" on storage.objects
for select
to public
using (bucket_id = 'campaign-images');

drop policy if exists "business users upload campaign images" on storage.objects;
create policy "business users upload campaign images" on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'campaign-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_user_has_role('business'::public.user_role)
);

drop policy if exists "business users update own campaign images" on storage.objects;
create policy "business users update own campaign images" on storage.objects
for update
to authenticated
using (
  bucket_id = 'campaign-images'
  and owner = auth.uid()
  and public.current_user_has_role('business'::public.user_role)
)
with check (
  bucket_id = 'campaign-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_user_has_role('business'::public.user_role)
);

drop policy if exists "business users delete own campaign images" on storage.objects;
create policy "business users delete own campaign images" on storage.objects
for delete
to authenticated
using (
  bucket_id = 'campaign-images'
  and owner = auth.uid()
  and public.current_user_has_role('business'::public.user_role)
);
