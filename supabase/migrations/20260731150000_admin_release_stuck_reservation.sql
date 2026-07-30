-- 검수 신청을 철회해 draft로 돌아온 캠페인은 포인트 예약을 유지한다(다시 신청할
-- 때 재예약 실패를 피하려는 의도적 설계). 그런데 사장이 그대로 방치하면 이 예약을
-- 풀 방법이 아무에게도 없다. admin_reject_campaign은 draft를 받지 않고,
-- cancel_campaign_before_publish는 가게 본인 전용이다.
--
-- 그 구멍 하나만 메운다. 검수 중~공개 예정 상태는 admin_reject_campaign이,
-- 공개 이후는 모집 마감 정산이 담당하므로 이 함수는 draft만 받는다.

create or replace function public.admin_release_campaign_reservation(
  target_campaign_id uuid,
  target_reason text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign public.campaigns;
  released_points integer;
begin
  if not public.is_admin() then
    raise exception '관리자만 예약을 해제할 수 있습니다.';
  end if;

  if target_reason is null or length(trim(target_reason)) < 2 then
    raise exception '해제 사유를 입력해주세요.';
  end if;

  select * into target_campaign
  from public.campaigns
  where id = target_campaign_id
  for update;

  if not found then
    raise exception '캠페인을 찾을 수 없습니다.';
  end if;

  if target_campaign.status <> 'draft' then
    raise exception '초안 상태의 캠페인만 예약을 해제할 수 있습니다. 검수 중인 캠페인은 반려를 사용해주세요.';
  end if;

  released_points := public.release_campaign_point_reservation(
    target_campaign_id,
    trim(target_reason),
    'admin_release:' || target_campaign_id::text
  );

  if released_points = 0 then
    raise exception '해제할 활성 예약이 없습니다.';
  end if;

  return released_points;
end;
$$;

revoke all on function public.admin_release_campaign_reservation(uuid, text) from public;
grant execute on function public.admin_release_campaign_reservation(uuid, text) to authenticated;
