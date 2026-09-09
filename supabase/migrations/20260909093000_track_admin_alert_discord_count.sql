-- 같은 실패 이벤트가 하루 동안 추가 발생하면 상세 집계를 다시 보낸다. 이미 전송된
-- 알림은 현재 집계 수를 기준점으로 삼아 배포 직후 중복 발송하지 않는다.
alter table public.admin_alerts
  add column if not exists discord_notified_count integer not null default 0;

update public.admin_alerts
set discord_notified_count = greatest(0, coalesce((metadata ->> 'count')::integer, 0))
where alert_type = 'app_failure'
  and discord_sent_at is not null;
