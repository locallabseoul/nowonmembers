-- 문자 발송 서비스(알리고)를 연결한다. 이제 실제로 문자가 나가므로 결과를 남겨야 한다.
--
-- 알리고는 한 번 요청에 여러 번호를 함께 보내고 성공/실패 건수만 돌려준다. 누가
-- 실패했는지는 알려주지 않으므로, 한 발송 건 단위로 성공과 실패를 기록한다.
-- 나중에 발송 결과를 조회하려면 알리고가 준 msg_id가 필요해 함께 남긴다.

alter table public.admin_messages add column if not exists provider_message_id text;
alter table public.admin_messages add column if not exists sms_sent_count integer not null default 0;
alter table public.admin_messages add column if not exists sms_failed_count integer not null default 0;
alter table public.admin_messages add column if not exists error text;

-- 보내는 중(pending)과 실패(failed)가 생겼다.
alter table public.admin_messages drop constraint if exists admin_messages_status_check;
alter table public.admin_messages add constraint admin_messages_status_check
  check (status in ('sent', 'partially_sent', 'pending', 'failed'));

-- 수신자를 만든 시점에는 아직 발송 전이다. 'partially_sent' 대신 'pending'으로 두고,
-- 발송 결과가 오면 admin_finish_sms_send가 바꾼다. 나머지는 이전과 같다.
create or replace function public.admin_send_message(
  target_kind text,
  target_channels text[],
  target_title text,
  target_body text,
  target_link text,
  target_role text,
  target_verification text,
  allow_without_consent boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_message_id uuid;
  clean_title text := btrim(coalesce(target_title, ''));
  clean_body text := btrim(coalesce(target_body, ''));
  clean_link text := nullif(btrim(coalesce(target_link, '')), '');
  role_filter text := coalesce(nullif(btrim(coalesce(target_role, '')), ''), 'all');
  verification_filter text := coalesce(nullif(btrim(coalesce(target_verification, '')), ''), 'all');
  is_promotional boolean := target_kind = 'promotional';
  consent_override boolean;
  wants_app boolean := 'app' = any(target_channels);
  wants_sms boolean := 'sms' = any(target_channels);
  seoul_hour integer;
  notification_title text;
  total_count integer := 0;
  app_count integer := 0;
  sms_count integer := 0;
begin
  if not public.is_admin() then
    raise exception '관리자만 회원 메시지를 보낼 수 있습니다.';
  end if;

  if target_kind not in ('transactional', 'promotional') then
    raise exception '메시지 유형을 선택해주세요.';
  end if;

  if target_channels is null or array_length(target_channels, 1) is null then
    raise exception '보낼 채널을 하나 이상 선택해주세요.';
  end if;

  if not (target_channels <@ array['app', 'sms']) then
    raise exception '보낼 수 없는 채널입니다.';
  end if;

  if clean_title = '' or clean_body = '' then
    raise exception '제목과 내용을 입력해주세요.';
  end if;

  if role_filter not in ('all', 'creator', 'business') then
    raise exception '받는 사람 조건이 올바르지 않습니다.';
  end if;

  if verification_filter not in ('all', 'verified', 'pending', 'rejected') then
    raise exception '받는 사람 조건이 올바르지 않습니다.';
  end if;

  consent_override := is_promotional and coalesce(allow_without_consent, false);

  -- 야간 광고 제한은 수신자에게 밀어넣는 매체에 걸린다. 앱 알림함은 본인이 열어봐야
  -- 보이므로 대상이 아니고, 문자가 섞일 때만 막는다.
  if is_promotional and wants_sms then
    seoul_hour := extract(hour from (now() at time zone 'Asia/Seoul'));
    if seoul_hour >= 21 or seoul_hour < 8 then
      raise exception '광고성 문자는 오후 9시부터 다음날 오전 8시까지 보낼 수 없습니다.';
    end if;
  end if;

  notification_title := case
    when is_promotional and clean_title not like '(광고)%' then '(광고) ' || clean_title
    else clean_title
  end;

  insert into public.admin_messages (
    kind, channels, title, body, link, target, consent_override, created_by
  )
  values (
    target_kind,
    target_channels,
    clean_title,
    clean_body,
    clean_link,
    jsonb_build_object(
      'role', role_filter,
      'verification', verification_filter,
      'marketingOnly', is_promotional and not consent_override
    ),
    consent_override,
    auth.uid()
  )
  returning id into new_message_id;

  insert into public.admin_message_recipients (message_id, user_id, channel, status, phone, sent_at)
  select
    new_message_id,
    profiles.id,
    channel,
    case when channel = 'app' then 'sent' else 'pending' end,
    case when channel = 'sms' then profiles.phone end,
    case when channel = 'app' then now() end
  from public.profiles
  cross join unnest(target_channels) as channel
  where profiles.status = 'active'
    and (role_filter = 'all' or profiles.role::text = role_filter)
    and (verification_filter = 'all' or profiles.verification_status::text = verification_filter)
    and (not is_promotional or consent_override or profiles.marketing_opt_in)
    and (channel <> 'sms' or coalesce(profiles.phone, '') <> '');

  if wants_app then
    insert into public.notifications (user_id, type, title, message, link)
    select recipients.user_id, 'admin_message', notification_title, clean_body, clean_link
    from public.admin_message_recipients recipients
    where recipients.message_id = new_message_id
      and recipients.channel = 'app';
  end if;

  select
    count(distinct user_id),
    count(*) filter (where channel = 'app'),
    count(*) filter (where channel = 'sms' and status = 'pending')
  into total_count, app_count, sms_count
  from public.admin_message_recipients
  where message_id = new_message_id;

  if total_count = 0 then
    raise exception '조건에 맞는 회원이 없습니다.';
  end if;

  update public.admin_messages
  set recipient_count = total_count,
      app_sent_count = app_count,
      sms_pending_count = sms_count,
      status = case when sms_count > 0 then 'pending' else 'sent' end
  where id = new_message_id;

  return new_message_id;
end;
$$;

-- 알리고 호출이 끝나면 결과를 남긴다. 요청 하나가 통째로 성공하거나 실패한다.
create or replace function public.admin_finish_sms_send(
  target_message_id uuid,
  succeeded boolean,
  provider_id text,
  error_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
begin
  if not public.is_admin() then
    raise exception '관리자만 발송 결과를 기록할 수 있습니다.';
  end if;

  update public.admin_message_recipients
  set status = case when succeeded then 'sent' else 'failed' end,
      sent_at = case when succeeded then now() end,
      error = case when succeeded then null else error_text end
  where message_id = target_message_id
    and channel = 'sms'
    and status = 'pending';

  get diagnostics affected = row_count;

  update public.admin_messages
  set provider_message_id = nullif(btrim(coalesce(provider_id, '')), ''),
      error = case when succeeded then null else error_text end,
      sms_sent_count = case when succeeded then affected else 0 end,
      sms_failed_count = case when succeeded then 0 else affected end,
      sms_pending_count = 0,
      status = case when succeeded then 'sent' else 'failed' end
  where id = target_message_id;
end;
$$;

revoke all on function public.admin_finish_sms_send(uuid, boolean, text, text) from public;
grant execute on function public.admin_finish_sms_send(uuid, boolean, text, text) to authenticated;
