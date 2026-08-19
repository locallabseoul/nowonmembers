create table if not exists public.admin_delegation_audits (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  target_user_id uuid not null references public.profiles(id),
  action text not null check (action in ('business_profile_create')),
  reason text not null check (char_length(btrim(reason)) > 0),
  changed_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_delegation_audits_target_created_idx
  on public.admin_delegation_audits (target_user_id, created_at desc);

alter table public.admin_delegation_audits enable row level security;

create policy "admins read delegation audits" on public.admin_delegation_audits
for select using (public.is_admin());

create policy "admins create delegation audits" on public.admin_delegation_audits
for insert with check (public.is_admin() and admin_id = auth.uid());
