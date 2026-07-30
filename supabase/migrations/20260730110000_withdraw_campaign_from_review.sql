-- 검수 대기 중에는 캠페인을 고칠 방법이 없었다. 관리자가 반려해주기를 기다리거나
-- 취소하고 처음부터 다시 만드는 수밖에 없었다.
--
-- 검수 요청을 스스로 회수해 초안으로 되돌린다. 예약 포인트는 그대로 둔다. 반환했다가
-- 다시 예약하면 그 사이 잔액이 바뀌어 재제출이 막힐 수 있고, 모집 인원도 바뀌지
-- 않으므로 예약 금액이 달라질 이유가 없다.
--
-- 회수하면 검수 목록에서 빠지므로, 관리자가 보던 내용과 승인하는 내용이 달라지는
-- 일도 생기지 않는다.

create or replace function public.withdraw_campaign_from_review(target_campaign_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign record;
begin
  if not public.current_user_has_role('business') then
    raise exception '가게 계정만 검수 요청을 회수할 수 있습니다.';
  end if;

  select
    campaigns.id,
    campaigns.status,
    business_profiles.user_id
  into target_campaign
  from public.campaigns
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaigns.id = target_campaign_id
  for update of campaigns;

  if not found or target_campaign.user_id <> auth.uid() then
    raise exception '캠페인을 찾을 수 없습니다.';
  end if;

  -- 관리자가 먼저 승인하거나 반려했다면 회수할 것이 없다.
  if target_campaign.status <> 'in_review' then
    raise exception '검수 대기 중인 캠페인만 회수할 수 있습니다.';
  end if;

  update public.campaigns
  set status = 'draft', updated_at = now()
  where id = target_campaign_id;

  return true;
end;
$$;

revoke all on function public.withdraw_campaign_from_review(uuid) from public;
grant execute on function public.withdraw_campaign_from_review(uuid) to authenticated;
