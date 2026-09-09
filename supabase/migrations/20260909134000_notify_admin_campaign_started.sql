-- 가게가 선정을 마쳐 캠페인이 실제 진행 단계로 들어가면 관리자에게도 알려준다.
-- 회원 대상 notification_events와 섞지 않고 관리자 운영 알림으로만 생성한다.
create or replace function public.notify_admin_campaign_started()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  business_name text;
  selected_count integer;
  due_date date;
begin
  if new.status <> 'in_progress' or old.status = 'in_progress' then
    return new;
  end if;

  select business_profiles.business_name
  into business_name
  from public.business_profiles
  where business_profiles.id = new.business_id;

  select count(*), max(collaborations.submission_due)
  into selected_count, due_date
  from public.collaborations
  where collaborations.campaign_id = new.id
    and collaborations.status not in ('cancelled', 'no_show');

  insert into public.admin_alerts (
    fingerprint,
    alert_type,
    severity,
    title,
    body,
    action_link,
    resource_type,
    resource_id,
    metadata
  ) values (
    'campaign_started:' || new.id,
    'campaign_started',
    'info',
    '캠페인 진행이 시작되었습니다',
    new.title || E'\n가게: ' || coalesce(business_name, '가게명 미등록')
      || E'\n선정 인원: ' || selected_count || '명'
      || E'\n콘텐츠 제출 마감: ' || coalesce(to_char(due_date, 'YYYY-MM-DD'), '미정')
      || E'\n다음 단계: 선정자의 방문 및 콘텐츠 제출',
    '/admin/campaigns?campaign=' || new.id || '&tab=submissions',
    'campaign',
    new.id,
    jsonb_build_object(
      'campaignTitle', new.title,
      'businessName', business_name,
      'selectedCount', selected_count,
      'submissionDue', due_date
    )
  )
  on conflict (fingerprint) do nothing;

  return new;
exception
  when others then
    raise warning 'notify_admin_campaign_started failed: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists notify_admin_campaign_started on public.campaigns;
create trigger notify_admin_campaign_started
after update of status on public.campaigns
for each row execute function public.notify_admin_campaign_started();

-- 배포 직전에 이미 시작된 캠페인도 최근 24시간 안의 건은 한 번 알려준다.
insert into public.admin_alerts (
  fingerprint, alert_type, severity, title, body, action_link, resource_type, resource_id, metadata
)
select
  'campaign_started:' || campaigns.id,
  'campaign_started',
  'info',
  '캠페인 진행이 시작되었습니다',
  campaigns.title || E'\n가게: ' || coalesce(business_profiles.business_name, '가게명 미등록')
    || E'\n선정 인원: ' || count(collaborations.id) || '명'
    || E'\n콘텐츠 제출 마감: ' || coalesce(to_char(max(collaborations.submission_due), 'YYYY-MM-DD'), '미정')
    || E'\n다음 단계: 선정자의 방문 및 콘텐츠 제출',
  '/admin/campaigns?campaign=' || campaigns.id || '&tab=submissions',
  'campaign',
  campaigns.id,
  jsonb_build_object(
    'campaignTitle', campaigns.title,
    'businessName', business_profiles.business_name,
    'selectedCount', count(collaborations.id),
    'submissionDue', max(collaborations.submission_due)
  )
from public.campaigns
join public.business_profiles on business_profiles.id = campaigns.business_id
join public.collaborations on collaborations.campaign_id = campaigns.id
  and collaborations.status not in ('cancelled', 'no_show')
where campaigns.status = 'in_progress'
  and campaigns.updated_at >= now() - interval '24 hours'
group by campaigns.id, campaigns.title, business_profiles.business_name
on conflict (fingerprint) do nothing;

revoke all on function public.notify_admin_campaign_started() from public;
