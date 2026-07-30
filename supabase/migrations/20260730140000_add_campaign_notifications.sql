-- notifications 테이블은 20260703010000부터 있었다. 새로 만들지 않고 부족한 컬럼만
-- 더한다. 본문 컬럼 이름은 기존대로 message를 쓴다.
--
-- 트리거가 실패하면 캠페인 승인이나 지원 같은 본 작업까지 막힌다. 실제로 그런 사고가
-- 있었으므로, 알림 생성은 실패해도 본 작업을 되돌리지 않도록 예외를 삼킨다.

alter table public.notifications add column if not exists link text;
alter table public.notifications add column if not exists campaign_id uuid references public.campaigns(id) on delete cascade;

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

-- 기존 정책은 select와 관리자 전권뿐이라 본인이 읽음 처리를 할 수 없었다.
drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.create_notification(
  target_user_id uuid,
  target_type text,
  target_title text,
  target_message text,
  target_link text,
  target_campaign_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id is null then
    return;
  end if;

  insert into public.notifications (user_id, type, title, message, link, campaign_id)
  values (target_user_id, target_type, target_title, target_message, target_link, target_campaign_id);
exception
  -- 알림은 부가 기능이다. 실패하더라도 캠페인 승인이나 지원 등록을 되돌리지 않는다.
  when others then
    raise warning 'create_notification failed: %', sqlerrm;
end;
$$;

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
after insert on public.campaign_applications
for each row execute function public.notify_business_on_application();

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
    perform public.create_notification(
      owner_id,
      'campaign_approved',
      '캠페인이 공개되었습니다',
      coalesce(new.title, '캠페인') || ' 캠페인이 승인되어 모집을 시작했습니다.',
      '/business/dashboard?campaign=' || new.id::text,
      new.id
    );
  elsif new.status = 'revision_requested' then
    perform public.create_notification(
      owner_id,
      'campaign_revision_requested',
      '캠페인 수정이 필요합니다',
      coalesce(new.admin_memo, '운영자가 캠페인 수정을 요청했습니다.'),
      '/business/campaigns/' || new.id::text || '/edit',
      new.id
    );
  elsif new.status = 'selecting' then
    perform public.create_notification(
      owner_id,
      'campaign_selecting',
      '모집이 마감되었습니다',
      coalesce(new.title, '캠페인') || ' 캠페인의 모집이 끝났습니다. 지원자를 선정해주세요.',
      '/business/dashboard?campaign=' || new.id::text,
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notify_business_on_campaign_status on public.campaigns;
create trigger notify_business_on_campaign_status
after update of status on public.campaigns
for each row execute function public.notify_business_on_campaign_status();

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

  perform public.create_notification(
    creator_user_id,
    'collaboration_selected',
    '캠페인에 선정되었습니다',
    coalesce(campaign_title, '캠페인') || ' 캠페인에 선정되었습니다. 방문 일정을 확인해주세요.',
    '/creator/submissions/' || new.id::text,
    new.campaign_id
  );

  return new;
end;
$$;

drop trigger if exists notify_creator_on_selection on public.collaborations;
create trigger notify_creator_on_selection
after insert on public.collaborations
for each row execute function public.notify_creator_on_selection();

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
    perform public.create_notification(
      owner_id,
      'submission_received',
      '콘텐츠가 제출되었습니다',
      coalesce(campaign_title, '캠페인') || ' 캠페인의 콘텐츠가 제출되었습니다.',
      '/business/dashboard?campaign=' || target_campaign_id::text || '&tab=submissions',
      target_campaign_id
    );
  end if;

  if tg_op = 'UPDATE' and new.review_status is distinct from old.review_status then
    if new.review_status = 'approved' then
      perform public.create_notification(
        creator_user_id,
        'submission_approved',
        '제출한 콘텐츠가 승인되었습니다',
        coalesce(campaign_title, '캠페인') || ' 캠페인의 콘텐츠가 승인되었습니다.',
        '/creator/submissions/' || new.collaboration_id::text,
        target_campaign_id
      );
    elsif new.review_status = 'needs_revision' then
      perform public.create_notification(
        creator_user_id,
        'submission_needs_revision',
        '콘텐츠 수정이 필요합니다',
        coalesce(new.admin_memo, '운영자가 콘텐츠 수정을 요청했습니다.'),
        '/creator/submissions/' || new.collaboration_id::text,
        target_campaign_id
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists notify_on_submission_change on public.content_submissions;
create trigger notify_on_submission_change
after insert or update on public.content_submissions
for each row execute function public.notify_on_submission_change();

create or replace function public.mark_notifications_read(target_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and (target_ids is null or id = any(target_ids));

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.create_notification(uuid, text, text, text, text, uuid) from public;
revoke all on function public.mark_notifications_read(uuid[]) from public;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
