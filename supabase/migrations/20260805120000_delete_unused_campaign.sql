-- 관리자가 '반려'하면 캠페인이 cancelled가 되는데, 이 상태는 수정도 삭제도 할 수
-- 없어 목록에 영원히 남는다. 테스트로 만든 캠페인이나 잘못 올린 캠페인이 가게
-- 대시보드를 계속 차지한다.
--
-- 지원자도 협업도 없는 캠페인은 남길 기록이 없다. 초안뿐 아니라 취소·실패한
-- 캠페인도 지울 수 있게 한다. 지원자가 한 명이라도 있으면 그 사람의 이력이므로
-- 지우지 않는다.

drop function if exists public.delete_draft_campaign(uuid);

create or replace function public.delete_campaign(target_campaign_id uuid)
returns table (cover_image_url text, reference_image_urls text[])
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign record;
  activity_count integer;
begin
  if not public.current_user_has_role('business') then
    raise exception '가게 계정만 캠페인을 삭제할 수 있습니다.';
  end if;

  select
    campaigns.id,
    campaigns.status,
    campaigns.cover_image_url,
    campaigns.reference_image_urls,
    business_profiles.user_id
  into target_campaign
  from public.campaigns
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaigns.id = target_campaign_id
  for update of campaigns;

  if not found or target_campaign.user_id <> auth.uid() then
    raise exception '캠페인을 찾을 수 없습니다.';
  end if;

  if target_campaign.status not in ('draft', 'cancelled', 'failed') then
    raise exception '초안이거나 종료된 캠페인만 삭제할 수 있습니다. 진행 중인 캠페인은 먼저 취소해주세요.';
  end if;

  -- 지원했거나 선정된 사람이 있으면 그 사람의 활동 기록이다. 지우지 않는다.
  select
    (select count(*) from public.campaign_applications where campaign_id = target_campaign_id)
    + (select count(*) from public.collaborations where campaign_id = target_campaign_id)
  into activity_count;

  if activity_count > 0 then
    raise exception '지원자가 있었던 캠페인은 삭제할 수 없습니다.';
  end if;

  -- 예약이 남아 있으면 포인트부터 돌려준다. 이미 반환됐으면 아무 일도 하지 않는다.
  perform public.release_campaign_point_reservation(
    target_campaign_id,
    '캠페인 삭제',
    'campaign_delete:' || target_campaign_id::text
  );

  delete from public.campaign_point_reservations where campaign_id = target_campaign_id;
  delete from public.campaigns where id = target_campaign_id;

  return query select target_campaign.cover_image_url, target_campaign.reference_image_urls;
end;
$$;

revoke all on function public.delete_campaign(uuid) from public;
grant execute on function public.delete_campaign(uuid) to authenticated;

-- 삭제 RLS 정책도 초안 외에 종료된 캠페인을 포함한다. 함수가 security definer라
-- 실제 삭제는 정책을 우회하지만, 정책과 함수의 기준이 어긋나 있으면 나중에
-- 읽는 사람이 헷갈린다.
drop policy if exists "business owners delete unsubmitted drafts" on public.campaigns;
create policy "business owners delete inactive campaigns" on public.campaigns
for delete using (
  public.current_user_has_role('business')
  and status in ('draft', 'cancelled', 'failed')
  and exists (
    select 1
    from public.business_profiles
    where business_profiles.id = campaigns.business_id
      and business_profiles.user_id = auth.uid()
  )
);
