insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-images',
  'creator-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read creator images" on storage.objects;
create policy "public read creator images" on storage.objects
for select
to public
using (bucket_id = 'creator-images');

drop policy if exists "creator users upload creator images" on storage.objects;
create policy "creator users upload creator images" on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'creator-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_user_has_role('creator'::public.user_role)
);

drop policy if exists "creator users update own creator images" on storage.objects;
create policy "creator users update own creator images" on storage.objects
for update
to authenticated
using (
  bucket_id = 'creator-images'
  and owner = auth.uid()
  and public.current_user_has_role('creator'::public.user_role)
)
with check (
  bucket_id = 'creator-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_user_has_role('creator'::public.user_role)
);

drop policy if exists "creator users delete own creator images" on storage.objects;
create policy "creator users delete own creator images" on storage.objects
for delete
to authenticated
using (
  bucket_id = 'creator-images'
  and owner = auth.uid()
  and public.current_user_has_role('creator'::public.user_role)
);

with ranked_creator_channels as (
  select
    id,
    row_number() over (
      partition by creator_id, channel_url
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.creator_channels
)
delete from public.creator_channels
using ranked_creator_channels
where creator_channels.id = ranked_creator_channels.id
  and ranked_creator_channels.duplicate_rank > 1;

create unique index if not exists creator_channels_creator_id_channel_url_idx
on public.creator_channels (creator_id, channel_url);

with ranked_portfolios as (
  select
    id,
    row_number() over (
      partition by creator_id, url
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.portfolios
)
delete from public.portfolios
using ranked_portfolios
where portfolios.id = ranked_portfolios.id
  and ranked_portfolios.duplicate_rank > 1;

create unique index if not exists portfolios_creator_id_url_idx
on public.portfolios (creator_id, url);
