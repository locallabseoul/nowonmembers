-- 가게 사장님이 크리에이터로 잘못 가입하는 일이 계속 생긴다. 가입할 때 고른 역할은
-- 본인도 관리자도 바꿀 수 없어, 지금은 탈퇴 후 재가입뿐이다.
--
-- 관리자가 역할을 바꿀 수 있게 한다. 회원 스스로는 여전히 바꿀 수 없다.
--
-- 이미 캠페인에 지원했거나 협업 중인 크리에이터는 막는다. 역할이 바뀌면 그 지원과
-- 협업이 주인 없는 기록이 되고, 상대 가게도 진행 중이던 일을 잃는다.
--
-- 기존 프로필은 지우지 않는다. 잘못 눌러도 되돌릴 수 있어야 하고, 지운 프로필은
-- 복구할 방법이 없다. 역할에 맞지 않는 프로필은 화면에서 쓰이지 않을 뿐이다.

create or replace function public.admin_set_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile record;
  creator_profile_id uuid;
  activity_count integer := 0;
begin
  if not public.is_admin() then
    raise exception '관리자만 회원 역할을 변경할 수 있습니다.';
  end if;

  if target_user_id = auth.uid() then
    raise exception '자기 자신의 역할은 변경할 수 없습니다.';
  end if;

  if new_role not in ('business', 'creator') then
    raise exception '가게 또는 크리에이터로만 변경할 수 있습니다.';
  end if;

  select id, role, nickname into target_profile
  from public.profiles
  where id = target_user_id
  for update;

  if not found then
    raise exception '회원을 찾을 수 없습니다.';
  end if;

  if target_profile.role::text = new_role then
    return;
  end if;

  -- 크리에이터에서 벗어날 때는 진행 중인 활동이 없어야 한다.
  if target_profile.role = 'creator' then
    select creator_profiles.id into creator_profile_id
    from public.creator_profiles
    where creator_profiles.user_id = target_user_id;

    if creator_profile_id is not null then
      select
        (select count(*) from public.campaign_applications where creator_id = creator_profile_id)
        + (select count(*) from public.collaborations where creator_id = creator_profile_id)
      into activity_count;

      if activity_count > 0 then
        raise exception '이미 캠페인에 지원했거나 협업 중인 회원은 역할을 바꿀 수 없습니다.';
      end if;
    end if;
  end if;

  -- 가게에서 벗어날 때는 캠페인이 없어야 한다.
  if target_profile.role = 'business' then
    if exists (
      select 1
      from public.campaigns
      join public.business_profiles on business_profiles.id = campaigns.business_id
      where business_profiles.user_id = target_user_id
    ) then
      raise exception '캠페인을 만든 적 있는 가게는 역할을 바꿀 수 없습니다.';
    end if;
  end if;

  update public.profiles
  set role = new_role::public.user_role, updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
