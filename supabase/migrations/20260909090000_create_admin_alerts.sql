-- 회원 대상 자동 알림과 분리된 관리자 조치 대기열이다. 같은 문제가 반복 탐지돼도
-- fingerprint당 한 행만 유지하고, 문제가 사라지면 다음 탐지 때 자동으로 해결 처리한다.
create table public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  alert_type text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'ignored')),
  title text not null,
  body text not null default '',
  action_link text,
  resource_type text,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  discord_sent_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index admin_alerts_status_detected_idx on public.admin_alerts (status, last_detected_at desc);
create index admin_alerts_unsent_idx on public.admin_alerts (created_at) where status = 'open' and discord_sent_at is null;

alter table public.admin_alerts enable row level security;
create policy "admins read admin alerts" on public.admin_alerts
for select using (public.is_admin());

create or replace function public.refresh_admin_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  changed_count integer := 0;
  affected integer;
begin
  -- 모집 상태 전환은 기존 사용자 알림 트리거를 그대로 거친다.
  perform public.sync_expired_campaigns();

  insert into public.admin_alerts (
    fingerprint, alert_type, severity, title, body, action_link, resource_type, resource_id, metadata
  )
  select
    'campaign_selection_overdue:' || campaigns.id,
    'campaign_selection_overdue',
    case when today - campaigns.selection_date >= 3 then 'critical' else 'warning' end,
    '캠페인 선정이 지연되고 있습니다',
    campaigns.title || ' · 발표 예정일에서 ' || (today - campaigns.selection_date) || '일 지났습니다.',
    '/admin/campaigns?campaign=' || campaigns.id,
    'campaign', campaigns.id,
    jsonb_build_object('campaignTitle', campaigns.title, 'overdueDays', today - campaigns.selection_date)
  from public.campaigns
  where campaigns.status = 'selecting'
    and campaigns.selection_date is not null
    and campaigns.selection_date < today
  on conflict (fingerprint) do update set
    severity = excluded.severity,
    status = case when admin_alerts.status = 'resolved' then 'open' else admin_alerts.status end,
    title = excluded.title,
    body = excluded.body,
    metadata = excluded.metadata,
    last_detected_at = now(),
    discord_sent_at = case when admin_alerts.status = 'resolved' then null else admin_alerts.discord_sent_at end,
    resolved_at = null,
    updated_at = now();
  get diagnostics affected = row_count; changed_count := changed_count + affected;

  insert into public.admin_alerts (
    fingerprint, alert_type, severity, title, body, action_link, resource_type, resource_id, metadata
  )
  select
    case when collaborations.submission_due < today then 'content_submission_overdue:' else 'content_submission_due_soon:' end || collaborations.id,
    case when collaborations.submission_due < today then 'content_submission_overdue' else 'content_submission_due_soon' end,
    case when collaborations.submission_due < today then 'critical' else 'warning' end,
    case when collaborations.submission_due < today then '콘텐츠 제출 기한을 넘겼습니다' else '콘텐츠 제출 마감이 임박했습니다' end,
    campaigns.title || ' · ' || coalesce(profiles.nickname, '크리에이터') || ' · 제출 마감 ' || to_char(collaborations.submission_due, 'YYYY-MM-DD'),
    '/admin/campaigns?campaign=' || campaigns.id || '&tab=submissions',
    'collaboration', collaborations.id,
    jsonb_build_object('campaignId', campaigns.id, 'campaignTitle', campaigns.title, 'creatorNickname', profiles.nickname, 'submissionDue', collaborations.submission_due)
  from public.collaborations
  join public.campaigns on campaigns.id = collaborations.campaign_id
  join public.creator_profiles on creator_profiles.id = collaborations.creator_id
  join public.profiles on profiles.id = creator_profiles.user_id
  left join public.content_submissions on content_submissions.collaboration_id = collaborations.id
  where collaborations.status not in ('cancelled', 'no_show', 'completed')
    and content_submissions.id is null
    and collaborations.submission_due is not null
    and collaborations.submission_due <= today + 3
  on conflict (fingerprint) do update set
    severity = excluded.severity,
    status = case when admin_alerts.status = 'resolved' then 'open' else admin_alerts.status end,
    title = excluded.title,
    body = excluded.body,
    action_link = excluded.action_link,
    metadata = excluded.metadata,
    last_detected_at = now(),
    discord_sent_at = case when admin_alerts.status = 'resolved' then null else admin_alerts.discord_sent_at end,
    resolved_at = null,
    updated_at = now();
  get diagnostics affected = row_count; changed_count := changed_count + affected;

  insert into public.admin_alerts (
    fingerprint, alert_type, severity, title, body, action_link, resource_type, resource_id, metadata
  )
  select
    'submission_review_overdue:' || content_submissions.id,
    'submission_review_overdue', 'warning',
    '콘텐츠 검수가 지연되고 있습니다',
    campaigns.title || ' · ' || coalesce(profiles.nickname, '크리에이터') || ' · 제출 후 48시간 이상 경과',
    '/admin/submissions', 'submission', content_submissions.id,
    jsonb_build_object('campaignId', campaigns.id, 'campaignTitle', campaigns.title, 'creatorNickname', profiles.nickname)
  from public.content_submissions
  join public.collaborations on collaborations.id = content_submissions.collaboration_id
  join public.campaigns on campaigns.id = collaborations.campaign_id
  join public.creator_profiles on creator_profiles.id = collaborations.creator_id
  join public.profiles on profiles.id = creator_profiles.user_id
  where content_submissions.review_status = 'submitted'
    and content_submissions.updated_at < now() - interval '48 hours'
  on conflict (fingerprint) do update set
    status = case when admin_alerts.status = 'resolved' then 'open' else admin_alerts.status end,
    body = excluded.body,
    metadata = excluded.metadata,
    last_detected_at = now(),
    discord_sent_at = case when admin_alerts.status = 'resolved' then null else admin_alerts.discord_sent_at end,
    resolved_at = null,
    updated_at = now();
  get diagnostics affected = row_count; changed_count := changed_count + affected;

  -- 최근 하루의 실패는 이벤트 이름별·한국 날짜별로 묶어 Discord 폭주를 막는다.
  insert into public.admin_alerts (
    fingerprint, alert_type, severity, title, body, action_link, resource_type, metadata
  )
  select
    'app_failure:' || app_events.event || ':' || to_char(app_events.occurred_at at time zone 'Asia/Seoul', 'YYYY-MM-DD'),
    'app_failure', 'critical', '서비스 오류가 기록되었습니다',
    app_events.event || ' · 최근 발생 ' || count(*) || '건',
    '/admin/events?filter=failed&event=' || app_events.event,
    'app_event', jsonb_build_object('event', app_events.event, 'count', count(*))
  from public.app_events
  where app_events.occurred_at >= now() - interval '24 hours'
    and (app_events.event like '%_failed' or app_events.event like '%.failed')
  group by app_events.event, to_char(app_events.occurred_at at time zone 'Asia/Seoul', 'YYYY-MM-DD')
  on conflict (fingerprint) do update set
    status = case when admin_alerts.status = 'resolved' then 'open' else admin_alerts.status end,
    body = excluded.body,
    metadata = excluded.metadata,
    last_detected_at = now(),
    discord_sent_at = case when admin_alerts.status = 'resolved' then null else admin_alerts.discord_sent_at end,
    resolved_at = null,
    updated_at = now();
  get diagnostics affected = row_count; changed_count := changed_count + affected;

  -- 현재 조건에서 사라진 서비스 운영 문제는 자동 종료한다. ignored는 관리자의 의사를 보존한다.
  update public.admin_alerts set status = 'resolved', resolved_at = now(), updated_at = now()
  where status in ('open', 'acknowledged') and (
    (alert_type = 'campaign_selection_overdue' and not exists (
      select 1 from public.campaigns c where c.id = admin_alerts.resource_id and c.status = 'selecting' and c.selection_date < today
    )) or
    (alert_type = 'content_submission_due_soon' and not exists (
      select 1 from public.collaborations c left join public.content_submissions s on s.collaboration_id = c.id
      where c.id = admin_alerts.resource_id and c.status not in ('cancelled', 'no_show', 'completed') and s.id is null
        and c.submission_due between today and today + 3
    )) or
    (alert_type = 'content_submission_overdue' and not exists (
      select 1 from public.collaborations c left join public.content_submissions s on s.collaboration_id = c.id
      where c.id = admin_alerts.resource_id and c.status not in ('cancelled', 'no_show', 'completed') and s.id is null
        and c.submission_due < today
    )) or
    (alert_type = 'submission_review_overdue' and not exists (
      select 1 from public.content_submissions s where s.id = admin_alerts.resource_id and s.review_status = 'submitted'
        and s.updated_at < now() - interval '48 hours'
    ))
  );

  return changed_count;
end;
$$;

create or replace function public.admin_set_alert_status(target_id uuid, target_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception '관리자만 운영 알림을 변경할 수 있습니다.'; end if;
  if target_status not in ('open', 'acknowledged', 'resolved', 'ignored') then raise exception '알 수 없는 상태입니다.'; end if;
  update public.admin_alerts set
    status = target_status,
    acknowledged_at = case when target_status = 'acknowledged' then now() else acknowledged_at end,
    acknowledged_by = case when target_status = 'acknowledged' then auth.uid() else acknowledged_by end,
    resolved_at = case when target_status in ('resolved', 'ignored') then now() else null end,
    updated_at = now()
  where id = target_id;
end;
$$;

revoke all on function public.refresh_admin_alerts() from public;
revoke all on function public.admin_set_alert_status(uuid, text) from public;
grant execute on function public.admin_set_alert_status(uuid, text) to authenticated;
