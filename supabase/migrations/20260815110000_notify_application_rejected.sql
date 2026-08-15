-- 가게가 선정을 완료하면 남은 지원서는 rejected로 일괄 전환되는데, 이 전환을 잡는
-- 트리거가 없어 미선정 크리에이터는 아무 알림도 받지 못했다. 발표일에 결과를
-- 기다리다가 지원 내역이 조용히 사라지는 경험이었고, 수신 설정 화면의 "선정 결과는
-- 계속 보내드립니다"라는 약속과도 어긋났다.
--
-- 문자는 보내지 않는다. 미선정 통보까지 문자로 받는 건 과하다는 운영 판단이고,
-- 필요해지면 관리자 화면에서 토글만 켜면 된다.

insert into public.notification_events (key, label, audience, title, body, sort_order) values
  (
    'application_rejected',
    '미선정 안내',
    'creator',
    '캠페인 선정 결과 안내',
    '아쉽게도 {캠페인} 캠페인에 선정되지 않았습니다. 다른 캠페인에서 다시 만나요.',
    55
  )
on conflict (key) do nothing;

create or replace function public.notify_creator_on_application_rejected()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_user_id uuid;
  campaign_title text;
begin
  -- 선정 절차에서 떨어진 경우만 안내한다. 본인이 취소한 지원이 다른 경로로
  -- rejected가 되는 일은 없지만, 전이 조건을 명시해 둔다.
  if old.status not in ('submitted', 'recommended') or new.status <> 'rejected' then
    return new;
  end if;

  select creator_profiles.user_id into creator_user_id
  from public.creator_profiles
  where creator_profiles.id = new.creator_id;

  select campaigns.title into campaign_title
  from public.campaigns
  where campaigns.id = new.campaign_id;

  perform public.dispatch_notification(
    'application_rejected',
    creator_user_id,
    campaign_title,
    null,
    '/campaigns/' || new.campaign_id::text,
    new.campaign_id
  );

  return new;
end;
$$;

drop trigger if exists notify_creator_on_application_rejected on public.campaign_applications;
create trigger notify_creator_on_application_rejected
after update of status on public.campaign_applications
for each row execute function public.notify_creator_on_application_rejected();

-- ─── 소급 발송 ───
--
-- 트리거는 앞으로의 전환만 잡는다. 이미 선정이 끝난 캠페인(미학맥주)의 미선정자는
-- 여기서 한 번 채워 보낸다. 진행 중인 캠페인만 대상으로 한다 — 완료된 캠페인의
-- 미선정자에게 뒤늦게 보내면 안내가 아니라 소음이다. 같은 사람에게 두 번 가지 않게
-- 이미 같은 알림이 있으면 건너뛴다.
do $$
declare
  rejected_application record;
begin
  for rejected_application in
    select
      campaign_applications.campaign_id,
      campaigns.title as campaign_title,
      creator_profiles.user_id as creator_user_id
    from public.campaign_applications
    join public.campaigns on campaigns.id = campaign_applications.campaign_id
    join public.creator_profiles on creator_profiles.id = campaign_applications.creator_id
    where campaign_applications.status = 'rejected'
      and campaigns.status in ('in_progress', 'submission_review')
      and not exists (
        select 1 from public.notifications
        where notifications.user_id = creator_profiles.user_id
          and notifications.campaign_id = campaign_applications.campaign_id
          and notifications.type = 'application_rejected'
      )
  loop
    perform public.dispatch_notification(
      'application_rejected',
      rejected_application.creator_user_id,
      rejected_application.campaign_title,
      null,
      '/campaigns/' || rejected_application.campaign_id::text,
      rejected_application.campaign_id
    );
  end loop;
end;
$$;
