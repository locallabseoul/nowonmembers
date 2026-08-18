-- 관리자 콘솔은 크리에이터/가게 화면을 기반으로 하므로 주민 계정에는 관리자 플래그를 부여하지 않는다.
create or replace function public.admin_set_admin(
  target_user_id uuid,
  make_admin boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles%rowtype;
begin
  if not public.is_admin() then
    raise exception '관리자만 관리자 권한을 변경할 수 있습니다.';
  end if;
  if target_user_id = auth.uid() then
    raise exception '자기 자신의 관리자 권한은 변경할 수 없습니다.';
  end if;

  select * into target_profile
  from public.profiles
  where id = target_user_id
  for update;

  if not found then
    raise exception '회원을 찾을 수 없습니다.';
  end if;
  if make_admin and target_profile.role = 'resident' then
    raise exception '주민 회원은 크리에이터 또는 가게로 전환한 뒤 관리자로 지정할 수 있습니다.';
  end if;

  update public.profiles
  set is_admin = make_admin, updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_set_admin(uuid, boolean) from public;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;
