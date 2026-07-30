-- 지원자가 들어와도, 관리자가 캠페인을 승인해도, 크리에이터가 콘텐츠를 제출해도
-- 사장님은 대시보드를 직접 열어야만 알 수 있었다. 개인 알림을 쌓는다.
--
-- 운영자 공지(notices)는 모두에게 같은 내용을 보내는 반면, 알림은 사람마다 다르다.
-- 두 개를 한 테이블에 섞지 않고 헤더에서 합쳐 보여준다.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  -- 클릭했을 때 이동할 앱 내부 경로
  link text,
  campaign_id uuid references public.campaigns(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
for select using (user_id = auth.uid());

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

-- 트리거에서 공통으로 쓴다. RLS를 우회해야 하므로 security definer로 둔다.
create or replace function public.create_notification(
  target_user_id uuid,
  target_type text,
  target_title text,
  target_body text,
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

  insert into public.notifications (user_id, type, title, body, link, campaign_id)
  values (target_user_id, target_type, target_title, target_body, target_link, target_campaign_id);
end;
$$;

-- 새 지원자
create or replace function public.notify_business_on_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  select business_profiles.user_id as owner_id, campaigns.title
  into target
  from public.campaigns
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaigns.id = new.campaign_id;

  perform public.create_notification(
    target.owner_id,
    'application_received',
    '새 지원자가 있습니다',
    coalesce(target.title, '캠페인') || ' 캠페인에 새로운 지원이 들어왔습니다.',
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

-- 캠페인 검수 결과
create or replace function public.notify_business_on_campaign_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  if new.status = old.status then
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

-- 크리에이터 선정
create or replace function public.notify_creator_on_selection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  select creator_profiles.user_id as creator_user_id, campaigns.title
  into target
  from public.creator_profiles
  cross join public.campaigns
  where creator_profiles.id = new.creator_id
    and campaigns.id = new.campaign_id;

  perform public.create_notification(
    target.creator_user_id,
    'collaboration_selected',
    '캠페인에 선정되었습니다',
    coalesce(target.title, '캠페인') || ' 캠페인에 선정되었습니다. 방문 일정을 확인해주세요.',
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

-- 콘텐츠 제출과 검수 결과
create or replace function public.notify_on_submission_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  select
    business_profiles.user_id as owner_id,
    creator_profiles.user_id as creator_user_id,
    campaigns.id as campaign_id,
    campaigns.title
  into target
  from public.collaborations
  join public.campaigns on campaigns.id = collaborations.campaign_id
  join public.business_profiles on business_profiles.id = campaigns.business_id
  join public.creator_profiles on creator_profiles.id = collaborations.creator_id
  where collaborations.id = new.collaboration_id;

  if new.review_status = 'submitted' and (tg_op = 'INSERT' or old.review_status is distinct from 'submitted') then
    perform public.create_notification(
      target.owner_id,
      'submission_received',
      '콘텐츠가 제출되었습니다',
      coalesce(target.title, '캠페인') || ' 캠페인의 콘텐츠가 제출되었습니다.',
      '/business/dashboard?campaign=' || target.campaign_id::text || '&tab=submissions',
      target.campaign_id
    );
  end if;

  if tg_op = 'UPDATE' and new.review_status is distinct from old.review_status then
    if new.review_status = 'approved' then
      perform public.create_notification(
        target.creator_user_id,
        'submission_approved',
        '제출한 콘텐츠가 승인되었습니다',
        coalesce(target.title, '캠페인') || ' 캠페인의 콘텐츠가 승인되었습니다.',
        '/creator/submissions/' || new.collaboration_id::text,
        target.campaign_id
      );
    elsif new.review_status = 'needs_revision' then
      perform public.create_notification(
        target.creator_user_id,
        'submission_needs_revision',
        '콘텐츠 수정이 필요합니다',
        coalesce(new.admin_memo, '운영자가 콘텐츠 수정을 요청했습니다.'),
        '/creator/submissions/' || new.collaboration_id::text,
        target.campaign_id
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

-- 헤더에서 목록을 열면 한 번에 읽음 처리한다.
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
