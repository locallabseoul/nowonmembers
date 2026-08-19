-- SMS를 받을 수 없는 번호를 관리자가 사전에 등록하면 전화 인증 없이 가입할 수
-- 있게 한다. 번호 목록은 관리자와 service_role만 볼 수 있으며 공개 API로는
-- 존재 여부를 확인할 수 없다.
create table public.phone_signup_bypass_allowlist (
  phone text primary key check (phone ~ '^010[0-9]{8}$'),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.phone_signup_bypass_allowlist enable row level security;

create policy "Admins can read phone signup bypass allowlist"
on public.phone_signup_bypass_allowlist
for select
to authenticated
using (public.is_admin());

create policy "Admins can add phone signup bypass allowlist"
on public.phone_signup_bypass_allowlist
for insert
to authenticated
with check (public.is_admin() and created_by = auth.uid());

create policy "Admins can remove phone signup bypass allowlist"
on public.phone_signup_bypass_allowlist
for delete
to authenticated
using (public.is_admin());

revoke all on table public.phone_signup_bypass_allowlist from anon;
grant select, insert, delete on table public.phone_signup_bypass_allowlist to authenticated;
