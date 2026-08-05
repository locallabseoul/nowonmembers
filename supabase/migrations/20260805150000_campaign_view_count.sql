-- 캠페인이 얼마나 노출되고 있는지 가게가 알 방법이 없었다. 지원자가 적을 때
-- 노출이 부족한 건지 조건이 약한 건지 구분하려면 조회수가 필요하다.
--
-- 부풀려진 숫자는 오히려 신뢰를 깎으므로 세는 기준을 좁게 잡는다.
--   - 같은 사람이 여러 번 봐도 하루 한 번만
--   - 캠페인을 올린 가게 본인의 조회는 빼기
--   - 비로그인 방문자는 브라우저마다 발급한 식별자로 구분
--
-- 조회 기록 자체는 가게에게도 보여주지 않는다. 누가 봤는지가 아니라 몇 명이
-- 봤는지만 필요하고, 열람 이력은 그 자체로 민감하다.

create table if not exists public.campaign_views (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  viewer_key text not null,
  viewed_on date not null default ((now() at time zone 'Asia/Seoul')::date),
  created_at timestamptz not null default now(),
  primary key (campaign_id, viewer_key, viewed_on)
);

create index if not exists campaign_views_campaign_idx on public.campaign_views (campaign_id, viewed_on desc);

alter table public.campaign_views enable row level security;

-- 기록은 아래 함수로만 남기고 읽는다. 직접 접근은 열지 않는다.
revoke all on table public.campaign_views from anon, authenticated;

alter table public.campaigns
  add column if not exists view_count integer not null default 0;

create or replace function public.record_campaign_view(
  target_campaign_id uuid,
  target_viewer_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign record;
  inserted boolean;
begin
  if target_viewer_key is null or length(trim(target_viewer_key)) < 8 then
    return;
  end if;

  select campaigns.id, campaigns.status, business_profiles.user_id as owner_id
  into target_campaign
  from public.campaigns
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaigns.id = target_campaign_id;

  -- 공개된 캠페인만 센다. 초안이나 검수 중은 가게 본인만 볼 수 있다.
  if not found or target_campaign.status not in ('recruiting', 'selecting', 'in_progress', 'submission_review', 'completed') then
    return;
  end if;

  -- 가게가 자기 캠페인을 확인하는 건 노출이 아니다.
  if auth.uid() is not null and auth.uid() = target_campaign.owner_id then
    return;
  end if;

  insert into public.campaign_views (campaign_id, viewer_key)
  values (target_campaign_id, trim(target_viewer_key))
  on conflict do nothing;

  get diagnostics inserted = row_count;

  if inserted then
    update public.campaigns
    set view_count = view_count + 1
    where id = target_campaign_id;
  end if;
end;
$$;

revoke all on function public.record_campaign_view(uuid, text) from public;
grant execute on function public.record_campaign_view(uuid, text) to anon, authenticated;

-- 이미 쌓인 기록이 없으므로 집계는 0에서 시작한다.
