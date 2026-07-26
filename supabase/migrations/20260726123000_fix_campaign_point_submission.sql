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

  if target_campaign.status = 'in_review'
    and exists (
      select 1
      from public.campaign_point_reservations
      where campaign_id = target_campaign_id
        and status = 'reserved'
    ) then
    return query
    select true, target_campaign.recruit_count * 5000, point_wallets.available_points, 0
    from public.point_wallets
    where point_wallets.business_id = target_campaign.business_id;
    return;
  end if;

  if target_campaign.status <> 'draft' then
    raise exception '초안 상태의 캠페인만 검수 요청할 수 있습니다.';
  end if;

  if target_campaign.recruit_count < 1 or target_campaign.recruit_count > 100 then
    raise exception '선정 인원은 1명 이상 100명 이하로 설정해주세요.';
  end if;

  if target_campaign.billing_mode = 'legacy_free' then
    update public.campaigns
    set status = 'in_review', updated_at = now()
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
    where point_lots.business_id = target_campaign.business_id
      and point_lots.available_points > 0
      and point_lots.expires_at > now()
    order by
      case point_lots.kind when 'promotional' then 0 when 'admin' then 1 else 2 end,
      point_lots.expires_at,
      point_lots.created_at
    for update
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
  set status = 'in_review', updated_at = now()
  where id = target_campaign_id;

  return query
  select true, points_to_reserve, target_wallet.available_points - points_to_reserve, 0;
end;
$$;
