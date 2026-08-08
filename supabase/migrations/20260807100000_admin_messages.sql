-- 관리자가 회원에게 직접 소식을 전할 방법이 없었다. 공지는 사이트에 걸어두면 들어온
-- 사람만 보고, 알림은 캠페인 상태가 바뀔 때 트리거로만 나간다.
--
-- 문자는 발신번호 사전등록과 발송 서비스 계약이 끝나야 보낼 수 있다. 그때까지는
-- 앱 알림만 실제로 나가고, 문자 대상은 pending으로 쌓아둔다.
--
-- 광고성 정보는 동의자에게만 보낼 수 있고 (광고) 표기가 따라붙는다. 관리자가 이걸
-- 외우지 않아도 되도록, 유형만 고르면 대상과 문구가 자동으로 정해지게 한다.
-- 화면을 우회해도 같은 규칙이 걸리도록 이 함수 안에서 판단한다.

create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('transactional', 'promotional')),
  channels text[] not null check (channels <@ array['app', 'sms'] and array_length(channels, 1) >= 1),
  title text not null,
  body text not null,
  link text,
  -- 고른 조건을 그대로 남긴다. 나중에 회원이 바뀌어도 무엇을 기준으로 보냈는지 남는다.
  target jsonb not null default '{}'::jsonb,
  -- 광고를 미동의자에게도 보낸 건인지. 문제가 생기면 어떤 발송이었는지 찾을 수 있어야 한다.
  consent_override boolean not null default false,
  recipient_count integer not null default 0,
  app_sent_count integer not null default 0,
  sms_pending_count integer not null default 0,
  status text not null default 'sent' check (status in ('sent', 'partially_sent')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_message_recipients (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.admin_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('app', 'sms')),
  status text not null check (status in ('sent', 'pending', 'failed')),
  -- 발송 시점의 번호를 남긴다. 나중에 번호가 바뀌어도 어디로 보냈는지 알 수 있다.
  phone text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, channel)
);

create index if not exists admin_messages_created_idx on public.admin_messages (created_at desc);
create index if not exists admin_message_recipients_message_idx on public.admin_message_recipients (message_id);
create index if not exists admin_message_recipients_pending_idx
  on public.admin_message_recipients (channel, status)
  where status = 'pending';

alter table public.admin_messages enable row level security;
alter table public.admin_message_recipients enable row level security;

-- 읽기만 열어둔다. 쓰기는 아래 함수로만 한다.
drop policy if exists "admins read admin messages" on public.admin_messages;
create policy "admins read admin messages" on public.admin_messages
for select using (public.is_admin());

drop policy if exists "admins read admin message recipients" on public.admin_message_recipients;
create policy "admins read admin message recipients" on public.admin_message_recipients
for select using (public.is_admin());

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

  -- 거래 안내는 동의와 무관하므로 예외 자체가 성립하지 않는다.
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

  -- 조건은 한 번만 쓴다. 채널별 행은 unnest로 펼친다.
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
    -- 번호가 없는 회원에게는 문자 행을 만들지 않는다. 앱 알림은 그대로 간다.
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
      status = case when sms_count > 0 then 'partially_sent' else 'sent' end
  where id = new_message_id;

  return new_message_id;
end;
$$;

revoke all on function public.admin_send_message(text, text[], text, text, text, text, text, boolean) from public;
grant execute on function public.admin_send_message(text, text[], text, text, text, text, text, boolean) to authenticated;
