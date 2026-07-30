-- 관리자 화면에 회원 관리를 붙인다. profiles에는 관리자용 UPDATE 정책이 없어
-- 관리자조차 다른 계정의 역할·상태를 못 바꾸고, 지금까지 Table Editor로 직접
-- 고쳐 왔다. 정책을 넓히는 대신 좁은 함수 세 개만 연다. 정책을 넓히면 아무
-- 컬럼이나 바꿀 수 있게 되고, prevent_profile_privilege_changes 트리거와의
-- 상호작용도 다시 검증해야 한다.

-- 역할 변경. 승격(→admin)과 해제(→business/creator) 둘 다 이 함수로 한다.
create or replace function public.admin_set_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 회원 역할을 변경할 수 있습니다.';
  end if;

  -- 스스로 강등해 관리자가 아무도 안 남는 사고를 막는다. 자기 역할은 다른
  -- 관리자가 바꿔줘야 한다.
  if target_user_id = auth.uid() then
    raise exception '자기 자신의 역할은 변경할 수 없습니다.';
  end if;

  if new_role not in ('business', 'creator', 'admin') then
    raise exception '허용되지 않는 역할입니다.';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception '회원을 찾을 수 없습니다.';
  end if;

  update public.profiles
  set role = new_role::public.user_role, updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- 계정 정지·해제.
create or replace function public.admin_set_profile_status(
  target_user_id uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 회원 상태를 변경할 수 있습니다.';
  end if;

  if target_user_id = auth.uid() then
    raise exception '자기 자신의 계정 상태는 변경할 수 없습니다.';
  end if;

  if new_status not in ('active', 'suspended') then
    raise exception '허용되지 않는 상태입니다.';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception '회원을 찾을 수 없습니다.';
  end if;

  update public.profiles
  set status = new_status, updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_set_profile_status(uuid, text) from public;
grant execute on function public.admin_set_profile_status(uuid, text) to authenticated;

-- 인증 승인·반려. verification_status가 profiles와 역할별 프로필 테이블에 각각
-- 있어서 한쪽만 바꾸면 어긋난다. 세 곳을 한 번에 맞춘다.
create or replace function public.admin_set_verification(
  target_user_id uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 인증 상태를 변경할 수 있습니다.';
  end if;

  if new_status not in ('pending', 'verified', 'rejected') then
    raise exception '허용되지 않는 인증 상태입니다.';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception '회원을 찾을 수 없습니다.';
  end if;

  update public.profiles
  set verification_status = new_status::public.verification_status, updated_at = now()
  where id = target_user_id;

  update public.creator_profiles
  set verification_status = new_status::public.verification_status, updated_at = now()
  where user_id = target_user_id;

  update public.business_profiles
  set verification_status = new_status::public.verification_status, updated_at = now()
  where user_id = target_user_id;
end;
$$;

revoke all on function public.admin_set_verification(uuid, text) from public;
grant execute on function public.admin_set_verification(uuid, text) to authenticated;

-- profiles.status는 제약 없는 text였다. 현재 데이터는 전부 'active'이므로
-- 어휘를 고정해 오타로 계정이 잠기는 일을 막는다.
alter table public.profiles
  drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check check (status in ('active', 'suspended'));
