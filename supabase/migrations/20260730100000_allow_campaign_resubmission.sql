-- 관리자가 수정을 요청하면 캠페인이 revision_requested가 되는데, 이 상태에서 다시
-- 제출할 방법이 없어 캠페인이 막다른 길에 놓였다. 재제출을 허용한다.
--
-- requestCampaignRevision은 예약 포인트를 풀지 않으므로, 예약이 남아 있으면 다시
-- 예약하지 않고 상태만 되돌린다. 예약 없이 넘어온 캠페인만 새로 예약한다.

create or replace function public.submit_campaign_for_review(
  target_campaign_id uuid,
  target_idempotency_key text
)
returns table (
  submitted boolean,
  required_points integer,
  available_points integer,
  shortfall_points integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign record;
  target_wallet public.point_wallets;
  target_lot record;
  points_to_reserve integer;
  points_taken integer;
  remaining_points integer;
  has_active_reservation boolean;
begin
  if not public.current_user_has_role('business') then
    raise exception '가게 계정만 캠페인을 제출할 수 있습니다.';
  end if;

  select
    campaigns.id,
    campaigns.business_id,
    campaigns.status,
    campaigns.billing_mode,
    campaigns.recruit_count,
    business_profiles.user_id
  into target_campaign
  from public.campaigns
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaigns.id = target_campaign_id
  for update of campaigns;

  if not found or target_campaign.user_id <> auth.uid() then
    raise exception '캠페인을 찾을 수 없습니다.';
  end if;

  select exists (
    select 1
    from public.campaign_point_reservations
    where campaign_id = target_campaign_id
      and status = 'reserved'
  ) into has_active_reservation;

  -- 이미 제출된 캠페인을 다시 부르면 그대로 성공으로 돌려준다.
  if target_campaign.status = 'in_review' and has_active_reservation then
    return query
    select true, target_campaign.recruit_count * 5000, point_wallets.available_points, 0
    from public.point_wallets
    where point_wallets.business_id = target_campaign.business_id;
    return;
  end if;

  if target_campaign.status not in ('draft', 'revision_requested') then
    raise exception '초안 또는 수정 요청 상태의 캠페인만 검수 요청할 수 있습니다.';
  end if;

  if target_campaign.recruit_count < 1 or target_campaign.recruit_count > 100 then
    raise exception '선정 인원은 1명 이상 100명 이하로 설정해주세요.';
  end if;

  -- 수정 요청 상태는 예약을 그대로 들고 있다. 모집 인원은 수정할 수 없으므로 예약
  -- 금액도 그대로다. 다시 예약하지 않고 상태만 되돌린다.
  if has_active_reservation then
    update public.campaigns
    set status = 'in_review', admin_memo = null, updated_at = now()
    where id = target_campaign_id;

    return query
    select true, target_campaign.recruit_count * 5000, point_wallets.available_points, 0
    from public.point_wallets
    where point_wallets.business_id = target_campaign.business_id;
    return;
  end if;

  if target_campaign.billing_mode = 'legacy_free' then
    update public.campaigns
    set status = 'in_review', admin_memo = null, updated_at = now()
    where id = target_campaign_id;

    return query select true, 0, 0, 0;
    return;
  end if;

  perform public.ensure_point_wallet(target_campaign.business_id);
  perform public.expire_business_points(target_campaign.business_id);

  select point_wallets.*
  into target_wallet
  from public.point_wallets
  where point_wallets.business_id = target_campaign.business_id
  for update;

  points_to_reserve := target_campaign.recruit_count * 5000;

  if target_wallet.available_points < points_to_reserve then
    return query select
      false,
      points_to_reserve,
      target_wallet.available_points,
      points_to_reserve - target_wallet.available_points;
    return;
  end if;

  insert into public.campaign_point_reservations (
    campaign_id,
    business_id,
    requested_headcount,
    reserved_points
  ) values (
    target_campaign_id,
    target_campaign.business_id,
    target_campaign.recruit_count,
    points_to_reserve
  );

  remaining_points := points_to_reserve;

  for target_lot in
    select point_lots.id, point_lots.available_points
    from public.point_lots
    left join public.point_payment_orders
      on point_payment_orders.id = point_lots.payment_order_id
    where point_lots.business_id = target_campaign.business_id
      and point_lots.available_points > 0
      and point_lots.expires_at > now()
    order by
      case point_lots.kind
        when 'promotional' then 0
        when 'admin' then 1
        when 'paid' then 2
        when 'bonus' then 2
        else 3
      end,
      case
        when point_lots.kind in ('paid', 'bonus') then point_payment_orders.created_at
        else point_lots.created_at
      end,
      case point_lots.kind when 'paid' then 0 when 'bonus' then 1 else 0 end,
      point_lots.expires_at,
      point_lots.created_at
    for update of point_lots
  loop
    exit when remaining_points = 0;
    points_taken := least(target_lot.available_points, remaining_points);

    update public.point_lots
    set
      available_points = point_lots.available_points - points_taken,
      reserved_points = point_lots.reserved_points + points_taken,
      updated_at = now()
    where point_lots.id = target_lot.id;

    insert into public.campaign_point_allocations (
      reservation_campaign_id,
      lot_id,
      reserved_points
    ) values (
      target_campaign_id,
      target_lot.id,
      points_taken
    );

    remaining_points := remaining_points - points_taken;
  end loop;

  if remaining_points <> 0 then
    raise exception '포인트 예약 중 잔액이 변경되었습니다. 다시 시도해주세요.';
  end if;

  update public.point_wallets
  set
    available_points = point_wallets.available_points - points_to_reserve,
    reserved_points = point_wallets.reserved_points + points_to_reserve,
    updated_at = now()
  where point_wallets.business_id = target_campaign.business_id;

  insert into public.point_ledger (
    business_id,
    campaign_id,
    event_type,
    available_delta,
    reserved_delta,
    idempotency_key,
    memo,
    metadata
  ) values (
    target_campaign.business_id,
    target_campaign_id,
    'campaign_reserve',
    -points_to_reserve,
    points_to_reserve,
    target_idempotency_key,
    '캠페인 모집 정원 포인트 예약',
    jsonb_build_object('headcount', target_campaign.recruit_count, 'unitPoints', 5000)
  );

  update public.campaigns
  set status = 'in_review', admin_memo = null, updated_at = now()
  where id = target_campaign_id;

  return query
  select true, points_to_reserve, target_wallet.available_points - points_to_reserve, 0;
end;
$$;

revoke all on function public.submit_campaign_for_review(uuid, text) from public;
grant execute on function public.submit_campaign_for_review(uuid, text) to authenticated;
