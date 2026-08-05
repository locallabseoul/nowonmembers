-- 초안 캠페인을 지울 방법이 없었다. RLS에는 이미 초안 삭제 정책이 있지만,
-- 검수를 넣었다 회수하면 포인트 예약이 남고 그 예약이 외래키(on delete restrict)로
-- 삭제를 막는다. 목록에도 삭제 버튼이 없었다.
--
-- 예약을 먼저 반환하고 지운다. 원장(point_ledger)은 campaign_id가 on delete set
-- null이라 기록이 남고 참조만 끊긴다 — 포인트가 오간 사실은 지우지 않는다.
--
-- 스토리지에 올라간 이미지는 앱이 지워야 하므로 URL을 돌려준다.

create or replace function public.delete_draft_campaign(target_campaign_id uuid)
returns table (cover_image_url text, reference_image_urls text[])
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign record;
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

  -- 공개된 적 있는 캠페인은 지원자·정산 기록이 얽히므로 지우지 않는다.
  -- 검수 중인 캠페인은 먼저 회수해야 한다.
  if target_campaign.status <> 'draft' then
    raise exception '초안 상태의 캠페인만 삭제할 수 있습니다.';
  end if;

  -- 예약이 남아 있으면 포인트부터 돌려준다. 배분(allocations)은 예약을 지울 때
  -- 함께 지워진다.
  perform public.release_campaign_point_reservation(
    target_campaign_id,
    '초안 캠페인 삭제',
    'campaign_delete:' || target_campaign_id::text
  );

  delete from public.campaign_point_reservations where campaign_id = target_campaign_id;
  delete from public.campaigns where id = target_campaign_id;

  return query select target_campaign.cover_image_url, target_campaign.reference_image_urls;
end;
$$;

revoke all on function public.delete_draft_campaign(uuid) from public;
grant execute on function public.delete_draft_campaign(uuid) to authenticated;
