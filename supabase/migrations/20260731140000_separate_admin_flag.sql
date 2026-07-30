-- 지금까지 관리자는 role='admin'인 별도 역할이었다. 그래서 관리자가 되는 순간
-- 크리에이터도 가게도 아니게 되어 마이페이지가 사라졌다. 운영자도 실제로는
-- 크리에이터나 가게 중 하나다. 관리자 권한을 역할에서 떼어 별도 플래그로 둔다.
--
-- 모든 RLS 정책이 public.is_admin() 함수를 통해 관리자를 판별하므로, 이 함수의
-- 정의만 바꾸면 정책 60여 개가 한 번에 새 기준을 따른다.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 기존 admin 역할 계정을 옮긴다. 가게 프로필이 있으면 가게, 아니면 크리에이터.
-- user_role enum의 'admin' 값 자체는 제거할 수 없어 남지만(PostgreSQL 제약),
-- 이 시점 이후로 어떤 행도 그 값을 쓰지 않는다.
update public.profiles
set is_admin = true
where role = 'admin';

update public.profiles
set role = case
  when exists (select 1 from public.business_profiles where business_profiles.user_id = profiles.id) then 'business'::public.user_role
  else 'creator'::public.user_role
end
where role = 'admin';

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin and status = 'active'
  );
$$;

-- 본인이 자기 플래그를 세우는 것을 막는다. role·status와 같은 취급.
create or replace function public.prevent_profile_privilege_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'profiles.role cannot be changed by the account owner';
    end if;

    if new.status is distinct from old.status then
      raise exception 'profiles.status cannot be changed by the account owner';
    end if;

    if new.verification_status is distinct from old.verification_status then
      raise exception 'profiles.verification_status cannot be changed by the account owner';
    end if;

    if new.is_admin is distinct from old.is_admin then
      raise exception 'profiles.is_admin cannot be changed by the account owner';
    end if;
  end if;

  return new;
end;
$$;

-- 가입 시 플래그를 세워 들어오는 것도 막는다.
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles
for insert with check (
  id = auth.uid()
  and role in ('business', 'creator')
  and verification_status = 'pending'
  and status = 'active'
  and is_admin = false
);

-- 역할 변경 함수는 플래그 토글로 대체한다. 역할을 추측해 되돌리던 문제가 사라진다.
drop function if exists public.admin_set_user_role(uuid, text);

create or replace function public.admin_set_admin(
  target_user_id uuid,
  make_admin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 관리자 권한을 변경할 수 있습니다.';
  end if;

  -- 스스로 해제해 관리자가 아무도 안 남는 사고를 막는다.
  if target_user_id = auth.uid() then
    raise exception '자기 자신의 관리자 권한은 변경할 수 없습니다.';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception '회원을 찾을 수 없습니다.';
  end if;

  update public.profiles
  set is_admin = make_admin, updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_set_admin(uuid, boolean) from public;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;
