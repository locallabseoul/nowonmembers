-- 자동 알림의 문구가 트리거 함수 안에 문자열로 박혀 있어, 말투 하나 다듬으려 해도
-- 마이그레이션을 배포해야 했다. 문구를 테이블로 옮겨 관리자 화면에서 고치게 한다.
--
-- 문자도 함께 보낼 수 있게 한다. 다만 알리고는 등록된 IP에서 온 요청만 받고 배포
-- 서버는 나가는 IP가 매번 바뀐다. 그래서 이벤트가 생기면 보낼 문자를 대기열에 쌓아두고,
-- 운영자가 자기 PC에서 관리자 화면을 열어 모아 보낸다.
--
-- 시드 문구는 지금 트리거가 쓰는 것과 글자까지 같다. 이 마이그레이션으로 회원이 받는
-- 알림이 달라지면 안 된다.

create table if not exists public.notification_events (
  key text primary key,
  label text not null,
  audience text not null check (audience in ('business', 'creator')),
  app_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  title text not null,
  body text not null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.sms_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null references public.notification_events(key) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  -- 쌓을 때의 번호를 남긴다. 나중에 번호가 바뀌어도 어디로 보냈는지 알 수 있다.
  phone text not null,
  title text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  error text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists sms_outbox_pending_idx on public.sms_outbox (created_at) where status = 'pending';
create index if not exists sms_outbox_created_idx on public.sms_outbox (created_at desc);

alter table public.notification_events enable row level security;
alter table public.sms_outbox enable row level security;

-- 문구와 켜고 끄기는 관리자가 직접 고친다. 공지 관리와 같은 방식.
drop policy if exists "admins manage notification events" on public.notification_events;
create policy "admins manage notification events" on public.notification_events
for all using (public.is_admin()) with check (public.is_admin());

-- 대기열은 읽기만 열어둔다. 쌓고 지우는 건 아래 함수로만 한다.
drop policy if exists "admins read sms outbox" on public.sms_outbox;
create policy "admins read sms outbox" on public.sms_outbox
for select using (public.is_admin());

-- 트리거는 이제 문구를 모른다. 이벤트 키만 넘기면 여기서 문구를 찾아 채운다.
--
-- create_notification과 마찬가지로 예외를 삼킨다. 알림이 실패했다고 캠페인 승인이나
-- 지원 등록이 되돌아가면 안 된다 — 실제로 그런 사고가 있었다.
create or replace function public.dispatch_notification(
  target_event_key text,
  target_user_id uuid,
  target_campaign_title text,
  target_reason text,
  target_link text,
  target_campaign_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.notification_events%rowtype;
  campaign_name text := coalesce(nullif(btrim(coalesce(target_campaign_title, '')), ''), '캠페인');
  reason_text text := coalesce(target_reason, '');
  final_title text;
  final_body text;
  target_phone text;
begin
  if target_user_id is null then
    return;
  end if;

  select * into event_row from public.notification_events where key = target_event_key;
  if not found then
    return;
  end if;

  final_title := replace(replace(event_row.title, '{캠페인}', campaign_name), '{사유}', reason_text);
  final_body := replace(replace(event_row.body, '{캠페인}', campaign_name), '{사유}', reason_text);

  if event_row.app_enabled then
    insert into public.notifications (user_id, type, title, message, link, campaign_id)
    values (target_user_id, target_event_key, final_title, final_body, target_link, target_campaign_id);
  end if;

  if event_row.sms_enabled then
    select nullif(btrim(coalesce(phone, '')), '') into target_phone
    from public.profiles
    where id = target_user_id;

    -- 번호가 없으면 문자를 만들 수 없다. 앱 알림은 그대로 나간다.
    if target_phone is not null then
      insert into public.sms_outbox (event_key, user_id, phone, title, body)
      values (target_event_key, target_user_id, target_phone, final_title, final_body);
    end if;
  end if;
exception
  when others then
    raise warning 'dispatch_notification failed: %', sqlerrm;
end;
$$;

-- ─── 기존 트리거를 dispatch_notification으로 옮긴다 ───

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
  -- 취소했다가 다시 지원한 것도 가게 입장에서는 새 지원자다.
  if tg_op = 'UPDATE' and not (old.status = 'cancelled' and new.status = 'submitted') then
    return new;
  end if;

  select business_profiles.user_id, campaigns.title
  into owner_id, campaign_title
  from public.campaigns
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaigns.id = new.campaign_id;

  perform public.dispatch_notification(
    'application_received',
    owner_id,
    campaign_title,
    null,
    '/business/dashboard?campaign=' || new.campaign_id::text,
    new.campaign_id
  );

  return new;
end;
$$;

create or replace function public.notify_business_on_campaign_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select business_profiles.user_id
  into owner_id
  from public.business_profiles
  where business_profiles.id = new.business_id;

  if new.status = 'recruiting' then
    perform public.dispatch_notification(
      'campaign_approved',
      owner_id,
      new.title,
      null,
      '/business/dashboard?campaign=' || new.id::text,
      new.id
    );
  elsif new.status = 'revision_requested' then
    perform public.dispatch_notification(
      'campaign_revision_requested',
      owner_id,
      new.title,
      -- 사유를 적지 않았을 때 쓸 문구. 사유 자체가 본문이라 여기서 채운다.
      coalesce(nullif(btrim(coalesce(new.admin_memo, '')), ''), '운영자가 캠페인 수정을 요청했습니다.'),
      '/business/campaigns/' || new.id::text || '/edit',
      new.id
    );
  elsif new.status = 'selecting' then
    perform public.dispatch_notification(
      'campaign_selecting',
      owner_id,
      new.title,
      null,
      '/business/dashboard?campaign=' || new.id::text,
      new.id
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_creator_on_selection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_user_id uuid;
  campaign_title text;
begin
  select creator_profiles.user_id into creator_user_id
  from public.creator_profiles
  where creator_profiles.id = new.creator_id;

  select campaigns.title into campaign_title
  from public.campaigns
  where campaigns.id = new.campaign_id;

  perform public.dispatch_notification(
    'collaboration_selected',
    creator_user_id,
    campaign_title,
    null,
    '/creator/submissions/' || new.id::text,
    new.campaign_id
  );

  return new;
end;
$$;

create or replace function public.notify_on_submission_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  creator_user_id uuid;
  target_campaign_id uuid;
  campaign_title text;
begin
  select
    business_profiles.user_id,
    creator_profiles.user_id,
    campaigns.id,
    campaigns.title
  into owner_id, creator_user_id, target_campaign_id, campaign_title
  from public.collaborations
  join public.campaigns on campaigns.id = collaborations.campaign_id
  join public.business_profiles on business_profiles.id = campaigns.business_id
  join public.creator_profiles on creator_profiles.id = collaborations.creator_id
  where collaborations.id = new.collaboration_id;

  if new.review_status = 'submitted'
    and (tg_op = 'INSERT' or old.review_status is distinct from 'submitted') then
    perform public.dispatch_notification(
      'submission_received',
      owner_id,
      campaign_title,
      null,
      '/business/dashboard?campaign=' || target_campaign_id::text || '&tab=submissions',
      target_campaign_id
    );
  end if;

  if tg_op = 'UPDATE' and new.review_status is distinct from old.review_status then
    if new.review_status = 'approved' then
      perform public.dispatch_notification(
        'submission_approved',
        creator_user_id,
        campaign_title,
        null,
        '/creator/submissions/' || new.collaboration_id::text,
        target_campaign_id
      );
    elsif new.review_status = 'needs_revision' then
      perform public.dispatch_notification(
        'submission_needs_revision',
        creator_user_id,
        campaign_title,
        coalesce(nullif(btrim(coalesce(new.admin_memo, '')), ''), '운영자가 콘텐츠 수정을 요청했습니다.'),
        '/creator/submissions/' || new.collaboration_id::text,
        target_campaign_id
      );
    end if;
  end if;

  return new;
end;
$$;

-- ─── 지금 쓰는 문구 그대로 시드 ───

insert into public.notification_events (key, label, audience, title, body, sort_order) values
  ('application_received', '새 지원자', 'business', '새 지원자가 있습니다', '{캠페인} 캠페인에 새로운 지원이 들어왔습니다.', 10),
  ('campaign_approved', '캠페인 승인', 'business', '캠페인이 공개되었습니다', '{캠페인} 캠페인이 승인되어 모집을 시작했습니다.', 20),
  ('campaign_revision_requested', '캠페인 수정 요청', 'business', '캠페인 수정이 필요합니다', '{사유}', 30),
  ('campaign_selecting', '모집 마감', 'business', '모집이 마감되었습니다', '{캠페인} 캠페인의 모집이 끝났습니다. 지원자를 선정해주세요.', 40),
  ('collaboration_selected', '크리에이터 선정', 'creator', '캠페인에 선정되었습니다', '{캠페인} 캠페인에 선정되었습니다. 방문 일정을 확인해주세요.', 50),
  ('submission_received', '콘텐츠 제출', 'business', '콘텐츠가 제출되었습니다', '{캠페인} 캠페인의 콘텐츠가 제출되었습니다.', 60),
  ('submission_approved', '콘텐츠 승인', 'creator', '제출한 콘텐츠가 승인되었습니다', '{캠페인} 캠페인의 콘텐츠가 승인되었습니다.', 70),
  ('submission_needs_revision', '콘텐츠 수정 요청', 'creator', '콘텐츠 수정이 필요합니다', '{사유}', 80)
on conflict (key) do nothing;

-- ─── 대기열 처리 ───

create or replace function public.admin_mark_outbox_result(
  target_id uuid,
  succeeded boolean,
  provider_id text,
  error_text text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 발송 결과를 기록할 수 있습니다.';
  end if;

  update public.sms_outbox
  set status = case when succeeded then 'sent' else 'failed' end,
      sent_at = case when succeeded then now() end,
      provider_message_id = nullif(btrim(coalesce(provider_id, '')), ''),
      error = case when succeeded then null else error_text end
  where id = target_id;
end;
$$;

-- 보내지 않고 넘기거나, 실패한 건을 다시 대기로 돌린다.
create or replace function public.admin_set_outbox_status(
  target_id uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 발송 대기열을 바꿀 수 있습니다.';
  end if;

  if new_status not in ('pending', 'skipped') then
    raise exception '대기 또는 건너뛰기로만 바꿀 수 있습니다.';
  end if;

  update public.sms_outbox
  set status = new_status,
      error = null,
      sent_at = null
  where id = target_id
    and status <> 'sent';
end;
$$;

revoke all on function public.dispatch_notification(text, uuid, text, text, text, uuid) from public;
revoke all on function public.admin_mark_outbox_result(uuid, boolean, text, text) from public;
revoke all on function public.admin_set_outbox_status(uuid, text) from public;
grant execute on function public.admin_mark_outbox_result(uuid, boolean, text, text) to authenticated;
grant execute on function public.admin_set_outbox_status(uuid, text) to authenticated;
