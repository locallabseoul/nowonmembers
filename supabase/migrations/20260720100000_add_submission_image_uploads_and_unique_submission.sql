insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-images',
  'submission-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read submission images" on storage.objects;
create policy "public read submission images" on storage.objects
for select
to public
using (bucket_id = 'submission-images');

drop policy if exists "creator users upload submission images" on storage.objects;
create policy "creator users upload submission images" on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'submission-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_user_has_role('creator'::public.user_role)
);

drop policy if exists "creator users update own submission images" on storage.objects;
create policy "creator users update own submission images" on storage.objects
for update
to authenticated
using (
  bucket_id = 'submission-images'
  and owner = auth.uid()
  and public.current_user_has_role('creator'::public.user_role)
)
with check (
  bucket_id = 'submission-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_user_has_role('creator'::public.user_role)
);

drop policy if exists "creator users delete own submission images" on storage.objects;
create policy "creator users delete own submission images" on storage.objects
for delete
to authenticated
using (
  bucket_id = 'submission-images'
  and owner = auth.uid()
  and public.current_user_has_role('creator'::public.user_role)
);

with ranked_submissions as (
  select
    id,
    row_number() over (
      partition by collaboration_id
      order by created_at desc, id desc
    ) as submission_rank
  from public.content_submissions
)
delete from public.content_submissions
using ranked_submissions
where content_submissions.id = ranked_submissions.id
  and ranked_submissions.submission_rank > 1;

create unique index if not exists content_submissions_collaboration_id_idx
on public.content_submissions (collaboration_id);
