create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notice_reads (
  notice_id uuid not null references public.notices(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);

alter table public.notices enable row level security;
alter table public.notice_reads enable row level security;

create policy "public can read published notices" on public.notices
for select using (status = 'published' or public.is_admin());

create policy "admins manage notices" on public.notices
for all using (public.is_admin()) with check (public.is_admin());

create policy "users manage own notice reads" on public.notice_reads
for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create index notices_published_at_idx on public.notices (published_at desc nulls last, created_at desc);
create index notice_reads_user_id_idx on public.notice_reads (user_id);
