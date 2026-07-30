-- 지원한 뒤 사정이 생겨도 빠질 방법이 없었다. application_status에 'cancelled'가
-- 있지만 아무도 쓰지 않는다.
--
-- 이건 편의 문제가 아니라 정산 문제다. settle_campaign_points는 지원자 수
-- (submitted/recommended/selected)로 청구액을 정하고, 그 카운트는 모집 마감 시점에
-- 확정된다. 못 하게 된 크리에이터가 목록에 남아 있으면 가게가 그 몫까지 낸다.
--
-- 그래서 취소는 모집이 열려 있는 동안만 허용한다. 마감 뒤에는 이미 정산이 끝났고,
-- 선정된 뒤에는 가게가 일정을 잡아둔 상태라 크리에이터 혼자 되돌릴 일이 아니다.

create or replace function public.cancel_campaign_application(target_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  if not public.current_user_has_role('creator') then
    raise exception '크리에이터 계정만 지원을 취소할 수 있습니다.';
  end if;

  select
    campaign_applications.id,
    campaign_applications.status,
    creator_profiles.user_id,
    campaigns.status as campaign_status,
    campaigns.recruit_end
  into target
  from public.campaign_applications
  join public.creator_profiles on creator_profiles.id = campaign_applications.creator_id
  join public.campaigns on campaigns.id = campaign_applications.campaign_id
  where campaign_applications.id = target_application_id
  for update of campaign_applications;

  if not found or target.user_id <> auth.uid() then
    raise exception '지원 내역을 찾을 수 없습니다.';
  end if;

  if target.status = 'cancelled' then
    return;
  end if;

  if target.status <> 'submitted' and target.status <> 'recommended' then
    raise exception '이미 선정 결과가 나온 지원은 취소할 수 없습니다. 매장에 연락해주세요.';
  end if;

  -- 마감 판정은 정산 스케줄러(expire_recruiting_campaigns)와 같은 기준을 쓴다.
  if target.campaign_status <> 'recruiting'
    or target.recruit_end is null
    or target.recruit_end < ((now() at time zone 'Asia/Seoul')::date)
  then
    raise exception '모집이 마감된 캠페인은 지원을 취소할 수 없습니다.';
  end if;

  update public.campaign_applications
  set status = 'cancelled'
  where id = target_application_id;
end;
$$;

revoke all on function public.cancel_campaign_application(uuid) from public;
grant execute on function public.cancel_campaign_application(uuid) to authenticated;

-- campaign_applications에 unique (campaign_id, creator_id)가 걸려 있어, 취소한 캠페인에
-- 다시 지원하면 insert가 막힌다. 마음이 바뀌어 돌아오는 걸 막을 이유가 없으므로
-- 취소된 행을 되살린다. 크리에이터에게는 update 정책이 없어 함수로 연다.
create or replace function public.restore_campaign_application(
  target_campaign_id uuid,
  application_message text,
  application_available_dates text,
  application_content_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  if not public.current_user_has_role('creator') then
    raise exception '크리에이터 계정만 지원할 수 있습니다.';
  end if;

  select
    campaign_applications.id,
    campaign_applications.status,
    campaigns.status as campaign_status,
    campaigns.recruit_end
  into target
  from public.campaign_applications
  join public.creator_profiles on creator_profiles.id = campaign_applications.creator_id
  join public.campaigns on campaigns.id = campaign_applications.campaign_id
  where campaign_applications.campaign_id = target_campaign_id
    and creator_profiles.user_id = auth.uid()
  for update of campaign_applications;

  if not found then
    raise exception '지원 내역을 찾을 수 없습니다.';
  end if;

  if target.status <> 'cancelled' then
    raise exception '이미 지원한 캠페인입니다.';
  end if;

  if target.campaign_status <> 'recruiting'
    or target.recruit_end is null
    or target.recruit_end < ((now() at time zone 'Asia/Seoul')::date)
  then
    raise exception '모집이 마감된 캠페인입니다.';
  end if;

  update public.campaign_applications
  set
    status = 'submitted',
    message = application_message,
    available_dates = application_available_dates,
    proposed_content_type = application_content_type,
    applied_at = now()
  where id = target.id;
end;
$$;

revoke all on function public.restore_campaign_application(uuid, text, text, text) from public;
grant execute on function public.restore_campaign_application(uuid, text, text, text) to authenticated;

-- 지원 알림은 insert에만 걸려 있어, 되살아난 지원은 가게에 알려지지 않는다.
-- 취소했다가 다시 지원한 것도 가게 입장에서는 새 지원자다.
create or replace function public.notify_business_on_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  campaign_title text;
begin
  if tg_op = 'UPDATE' and not (old.status = 'cancelled' and new.status = 'submitted') then
    return new;
  end if;

  select business_profiles.user_id, campaigns.title
  into owner_id, campaign_title
  from public.campaigns
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaigns.id = new.campaign_id;

  perform public.create_notification(
    owner_id,
    'application_received',
    '새 지원자가 있습니다',
    coalesce(campaign_title, '캠페인') || ' 캠페인에 새로운 지원이 들어왔습니다.',
    '/business/dashboard?campaign=' || new.campaign_id::text,
    new.campaign_id
  );

  return new;
end;
$$;

drop trigger if exists notify_business_on_application on public.campaign_applications;
create trigger notify_business_on_application
after insert or update of status on public.campaign_applications
for each row execute function public.notify_business_on_application();
