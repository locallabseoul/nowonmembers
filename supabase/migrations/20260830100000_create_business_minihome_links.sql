create table public.business_minihome_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  url text not null check (char_length(url) <= 2048 and url ~* '^https?://'),
  is_visible boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_minihome_links_list_idx
on public.business_minihome_links (business_id, is_visible, sort_order, created_at);

alter table public.business_minihome_links enable row level security;

create policy "public reads visible minihome links" on public.business_minihome_links
for select to public using (
  is_visible
  and exists (
    select 1
    from public.business_profiles business
    where business.id = business_minihome_links.business_id
      and business.is_public
      and business.verification_status = 'verified'
      and business.slug is not null
  )
);

create policy "business owners manage own minihome links" on public.business_minihome_links
for all to authenticated
using (
  exists (
    select 1 from public.business_profiles business
    where business.id = business_minihome_links.business_id
      and business.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.business_profiles business
    where business.id = business_minihome_links.business_id
      and business.user_id = auth.uid()
  )
);

create policy "admins manage minihome links" on public.business_minihome_links
for all to authenticated
using (public.is_admin())
with check (public.is_admin());
