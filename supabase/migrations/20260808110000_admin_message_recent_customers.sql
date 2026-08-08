-- 광고성 문자를 수신 동의자에게만 보내면 대상이 너무 좁다. 갓 가입한 크리에이터는
-- 캠페인 소식을 받으려고 들어온 사람인데도 소식을 전할 방법이 없다.
--
-- 정보통신망법 제50조 제1항 단서는, 거래관계를 통해 연락처를 수집한 경우 6개월 안에는
-- 같은 종류의 광고를 사전 동의 없이 보낼 수 있게 한다. 캠페인에 지원했거나 협업한
-- 크리에이터가 여기에 해당한다.
--
-- 예외가 적용되어도 (광고) 표기와 무료 수신거부 안내는 그대로 붙는다. 면제되는 것은
-- 사전 동의뿐이다.

create or replace function public.admin_send_message(
  target_kind text,
  target_channels text[],
  target_title text,
  target_body text,
  target_link text,
  target_role text,
  target_verification text,
  allow_without_consent boolean default false,
  allow_recent_customers boolean default false
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
  include_recent boolean;
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
  include_recent := is_promotional and not consent_override and coalesce(allow_recent_customers, false);

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
      'marketingOnly', is_promotional and not consent_override,
      'recentCustomers', include_recent
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
    and (
      not is_promotional
      or consent_override
      or profiles.marketing_opt_in
      -- 6개월 안에 캠페인에 지원했거나 협업한 크리에이터. 거래관계로 연락처를 받은
      -- 경우라 같은 종류의 광고는 사전 동의 없이 보낼 수 있다.
      or (
        include_recent
        and exists (
          select 1
          from public.creator_profiles
          where creator_profiles.user_id = profiles.id
            and (
              exists (
                select 1 from public.campaign_applications
                where campaign_applications.creator_id = creator_profiles.id
                  and campaign_applications.applied_at >= now() - interval '6 months'
              )
              or exists (
                select 1 from public.collaborations
                where collaborations.creator_id = creator_profiles.id
                  and collaborations.created_at >= now() - interval '6 months'
              )
            )
        )
      )
    )
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

-- 인자가 하나 늘었다. 예전 시그니처는 남겨두면 어느 쪽이 불릴지 모호해지므로 지운다.
drop function if exists public.admin_send_message(text, text[], text, text, text, text, text, boolean);

revoke all on function public.admin_send_message(text, text[], text, text, text, text, text, boolean, boolean) from public;
grant execute on function public.admin_send_message(text, text[], text, text, text, text, text, boolean, boolean) to authenticated;
