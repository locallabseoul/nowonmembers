-- 캠페인 목록과 상세의 '신청 N명'이 로그인하지 않은 방문자에게 늘 0으로 보였다.
-- 지원 내역(campaign_applications)은 본인·해당 가게·관리자만 읽을 수 있어서,
-- 조인으로 세면 권한이 없는 사람에게는 0이 나온다. 정작 그 숫자를 보고 지원을
-- 결정하는 건 아직 로그인하지 않은 크리에이터다.
--
-- 지원자 수만 캠페인 행에 둔다. 개별 지원 내역은 그대로 보호되고 집계만 공개된다.

alter table public.campaigns
  add column if not exists applicant_count integer not null default 0;

create or replace function public.refresh_campaign_applicant_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign_id uuid;
begin
  target_campaign_id := coalesce(new.campaign_id, old.campaign_id);

  update public.campaigns
  set applicant_count = (
    select count(distinct campaign_applications.creator_id)
    from public.campaign_applications
    where campaign_applications.campaign_id = target_campaign_id
      and campaign_applications.status <> 'cancelled'
  )
  where campaigns.id = target_campaign_id;

  return coalesce(new, old);
exception
  -- 집계가 실패해도 지원 자체를 되돌리지 않는다.
  when others then
    raise warning 'refresh_campaign_applicant_count failed: %', sqlerrm;
    return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_campaign_applicant_count on public.campaign_applications;
create trigger refresh_campaign_applicant_count
after insert or delete or update of status on public.campaign_applications
for each row execute function public.refresh_campaign_applicant_count();

-- 이미 쌓인 지원으로 한 번 채운다.
update public.campaigns
set applicant_count = (
  select count(distinct campaign_applications.creator_id)
  from public.campaign_applications
  where campaign_applications.campaign_id = campaigns.id
    and campaign_applications.status <> 'cancelled'
);
