alter table public.notices
add column is_pinned boolean not null default false;

alter table public.notices
add constraint notices_pinned_must_be_published
check (not is_pinned or status = 'published');

create unique index notices_single_pinned_idx
on public.notices ((1))
where is_pinned;
