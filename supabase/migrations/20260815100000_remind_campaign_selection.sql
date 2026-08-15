-- 모집이 끝나면 캠페인은 selecting으로 자동 전환되지만, 거기서 빠져나오는 자동 경로는 없다.
-- 가게가 선정을 미루면 캠페인은 가게가 약속한 발표일을 넘겨 무기한 selecting에 머물고,
-- 지원한 크리에이터는 발표일을 믿고 계속 기다린다.
--
-- 관리자가 지연을 발견해도 쓸 수단이 없었다. finalize_campaign_selection은 가게 소유자만
-- 부를 수 있다. 여기서도 그 경계는 유지한다 — 누구를 뽑을지는 가게가 정할 일이라
-- 관리자가 대신 확정하지 않고, 독촉만 보낸다.

alter table public.campaigns
  add column if not exists selection_reminded_at timestamptz;

-- 문구는 다른 자동 알림과 같이 관리자 화면에서 고칠 수 있어야 한다.
-- sort_order는 모집 마감(40)과 크리에이터 선정(50) 사이. 실제 흐름의 순서다.
insert into public.notification_events (key, label, audience, title, body, sort_order) values
  (
    'campaign_selection_overdue',
    '선정 지연 독촉',
    'business',
    '선정 발표일이 지났습니다',
    '{캠페인} 캠페인의 지원자 선정이 아직 끝나지 않았습니다. {사유}',
    45
  )
on conflict (key) do nothing;

create or replace function public.admin_remind_campaign_selection(target_campaign_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign record;
  today date := (now() at time zone 'Asia/Seoul')::date;
  overdue_days integer;
begin
  if not public.is_admin() then
    raise exception '관리자만 선정 독촉을 보낼 수 있습니다.';
  end if;

  select
    campaigns.id,
    campaigns.title,
    campaigns.status,
    campaigns.selection_date,
    campaigns.selection_reminded_at,
    business_profiles.user_id
  into target_campaign
  from public.campaigns
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaigns.id = target_campaign_id
  for update of campaigns;

  if not found then
    raise exception '캠페인을 찾을 수 없습니다.';
  end if;

  if target_campaign.status <> 'selecting' then
    raise exception '선정중인 캠페인만 독촉할 수 있습니다.';
  end if;

  -- 발표일이 없으면 무엇을 넘겼는지 말할 수 없다. 화면에서 지연으로 세지 않는 것과 같은 규칙이다.
  if target_campaign.selection_date is null then
    raise exception '선정 발표일이 없어 지연 여부를 판단할 수 없습니다.';
  end if;

  overdue_days := today - target_campaign.selection_date;
  if overdue_days <= 0 then
    raise exception '아직 선정 발표일이 지나지 않았습니다.';
  end if;

  -- 버튼 연타나 운영자 두 명이 연달아 누르는 경우에 가게로 문자가 겹쳐 나가면 안 된다.
  if target_campaign.selection_reminded_at is not null
    and target_campaign.selection_reminded_at > now() - interval '12 hours' then
    raise exception '12시간 안에 이미 독촉을 보냈습니다.';
  end if;

  perform public.dispatch_notification(
    'campaign_selection_overdue',
    target_campaign.user_id,
    target_campaign.title,
    '발표 예정일 ' || to_char(target_campaign.selection_date, 'YYYY-MM-DD') || '에서 '
      || overdue_days || '일 지났습니다. 지원자를 선정해 마무리해주세요.',
    '/business/dashboard?campaign=' || target_campaign.id::text,
    target_campaign.id
  );

  -- 알림이 실패해도(dispatch_notification은 예외를 삼킨다) 보낸 것으로 기록한다.
  -- 실패를 이유로 12시간 제한을 풀면 연타 방지가 무너진다.
  update public.campaigns
  set selection_reminded_at = now()
  where id = target_campaign_id;

  return overdue_days;
end;
$$;

revoke all on function public.admin_remind_campaign_selection(uuid) from public;
grant execute on function public.admin_remind_campaign_selection(uuid) to authenticated;
