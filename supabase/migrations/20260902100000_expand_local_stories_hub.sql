alter table public.local_stories
add column story_kind text not null default 'submission'
  check (story_kind in ('news', 'interview', 'submission')),
add column status text not null default 'published'
  check (status in ('draft', 'published')),
add column content_blocks jsonb not null default '[]'::jsonb
  check (jsonb_typeof(content_blocks) = 'array'),
add column author_name text not null default '노원멤버스 편집부',
add column updated_at timestamptz not null default now();

update public.local_stories
set
  story_kind = 'submission',
  status = case when published_at is null then 'draft' else 'published' end;

alter table public.local_stories
add constraint local_stories_published_state_check
check (
  (status = 'draft' and published_at is null)
  or (status = 'published' and published_at is not null)
);

drop policy if exists "public can read published stories" on public.local_stories;
create policy "public can read published stories" on public.local_stories
for select using (
  (status = 'published' and published_at is not null)
  or public.is_admin()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-images',
  'story-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads story images" on storage.objects
for select using (bucket_id = 'story-images');

create policy "admins upload story images" on storage.objects
for insert to authenticated
with check (bucket_id = 'story-images' and public.is_admin());

create policy "admins update story images" on storage.objects
for update to authenticated
using (bucket_id = 'story-images' and public.is_admin())
with check (bucket_id = 'story-images' and public.is_admin());

create policy "admins delete story images" on storage.objects
for delete to authenticated
using (bucket_id = 'story-images' and public.is_admin());

create index local_stories_public_hub_idx
on public.local_stories (story_kind, published_at desc)
where status = 'published' and published_at is not null;
