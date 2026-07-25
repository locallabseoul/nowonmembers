alter table public.campaigns
add column billing_mode text;

update public.campaigns
set billing_mode = 'legacy_free'
where billing_mode is null;

alter table public.campaigns
alter column billing_mode set default 'points_v1',
alter column billing_mode set not null;

alter table public.campaigns
add constraint campaigns_billing_mode_check
check (billing_mode in ('legacy_free', 'points_v1'));

create table public.point_wallets (
  business_id uuid primary key references public.business_profiles(id) on delete cascade,
  available_points integer not null default 0 check (available_points >= 0),
  reserved_points integer not null default 0 check (reserved_points >= 0),
  lifetime_credited_points bigint not null default 0 check (lifetime_credited_points >= 0),
  lifetime_spent_points bigint not null default 0 check (lifetime_spent_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.point_payment_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  order_id text not null unique,
  point_amount integer not null default 50000 check (point_amount = 50000),
  supply_amount integer not null default 50000 check (supply_amount = 50000),
  vat_amount integer not null default 5000 check (vat_amount = 5000),
  total_amount integer not null default 55000 check (total_amount = 55000),
  refunded_points integer not null default 0 check (refunded_points between 0 and point_amount),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'partially_refunded', 'refunded', 'cancelled')),
  payment_key text unique,
  payment_method text,
  failure_code text,
  failure_message text,
  accepted_terms_version text not null,
  provider_response jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.point_lots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  kind text not null check (kind in ('paid', 'promotional', 'admin')),
  payment_order_id uuid references public.point_payment_orders(id) on delete restrict,
  original_points integer not null check (original_points > 0),
  available_points integer not null check (available_points >= 0),
  reserved_points integer not null default 0 check (reserved_points >= 0),
  consumed_points integer not null default 0 check (consumed_points >= 0),
  refunded_points integer not null default 0 check (refunded_points >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint point_lots_balanced_check check (
    available_points + reserved_points + consumed_points + refunded_points = original_points
  )
);

create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  lot_id uuid references public.point_lots(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete set null,
  payment_order_id uuid references public.point_payment_orders(id) on delete set null,
  event_type text not null check (
    event_type in (
      'promotional_credit',
      'paid_credit',
      'admin_credit',
      'admin_debit',
      'campaign_reserve',
      'campaign_settle',
      'campaign_release',
      'point_expire',
      'refund_hold',
      'refund_complete',
      'refund_restore'
    )
  ),
  available_delta integer not null default 0,
  reserved_delta integer not null default 0,
  idempotency_key text not null unique,
  memo text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.campaign_point_reservations (
  campaign_id uuid primary key references public.campaigns(id) on delete restrict,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  requested_headcount integer not null check (requested_headcount > 0),
  unit_points integer not null default 5000 check (unit_points = 5000),
  reserved_points integer not null check (reserved_points > 0),
  billable_headcount integer check (billable_headcount >= 0),
  consumed_points integer not null default 0 check (consumed_points >= 0),
  returned_points integer not null default 0 check (returned_points >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'settled', 'released')),
  settlement_reason text,
  reserved_at timestamptz not null default now(),
  settled_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.campaign_point_allocations (
  reservation_campaign_id uuid not null references public.campaign_point_reservations(campaign_id) on delete cascade,
  lot_id uuid not null references public.point_lots(id) on delete restrict,
  reserved_points integer not null check (reserved_points > 0),
  consumed_points integer not null default 0 check (consumed_points >= 0),
  returned_points integer not null default 0 check (returned_points >= 0),
  primary key (reservation_campaign_id, lot_id),
  constraint campaign_point_allocations_balanced_check check (
    consumed_points + returned_points <= reserved_points
  )
);

create table public.point_refund_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  payment_order_id uuid not null references public.point_payment_orders(id) on delete restrict,
  point_lot_id uuid not null references public.point_lots(id) on delete restrict,
  refund_points integer not null check (refund_points > 0),
  refund_amount integer not null check (refund_amount > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  idempotency_key text not null unique,
  failure_message text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index point_lots_business_available_idx
on public.point_lots(business_id, expires_at, created_at)
where available_points > 0;

create index point_ledger_business_created_idx
on public.point_ledger(business_id, created_at desc);

create index point_payment_orders_business_created_idx
on public.point_payment_orders(business_id, created_at desc);

alter table public.point_wallets enable row level security;
alter table public.point_payment_orders enable row level security;
alter table public.point_lots enable row level security;
alter table public.point_ledger enable row level security;
alter table public.campaign_point_reservations enable row level security;
alter table public.campaign_point_allocations enable row level security;
alter table public.point_refund_requests enable row level security;

revoke insert, update, delete, truncate, references, trigger on public.point_wallets from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.point_payment_orders from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.point_lots from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.point_ledger from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.campaign_point_reservations from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.campaign_point_allocations from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.point_refund_requests from anon, authenticated;

grant select on public.point_wallets to authenticated;
grant select on public.point_payment_orders to authenticated;
grant select on public.point_lots to authenticated;
grant select on public.point_ledger to authenticated;
grant select on public.campaign_point_reservations to authenticated;
grant select on public.campaign_point_allocations to authenticated;
grant select on public.point_refund_requests to authenticated;

create or replace function public.owns_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_profiles
    where id = target_business_id
      and user_id = auth.uid()
  );
$$;

create policy "business owners read own point wallet" on public.point_wallets
for select using (public.is_admin() or public.owns_business(business_id));

create policy "business owners read own point orders" on public.point_payment_orders
for select using (public.is_admin() or public.owns_business(business_id));

create policy "business owners read own point lots" on public.point_lots
for select using (public.is_admin() or public.owns_business(business_id));

create policy "business owners read own point ledger" on public.point_ledger
for select using (public.is_admin() or public.owns_business(business_id));

create policy "business owners read own campaign reservations" on public.campaign_point_reservations
for select using (public.is_admin() or public.owns_business(business_id));

create policy "business owners read own campaign allocations" on public.campaign_point_allocations
for select using (
  public.is_admin()
  or exists (
    select 1
    from public.campaign_point_reservations
    where campaign_point_reservations.campaign_id = campaign_point_allocations.reservation_campaign_id
      and public.owns_business(campaign_point_reservations.business_id)
  )
);

create policy "business owners read own point refunds" on public.point_refund_requests
for select using (public.is_admin() or public.owns_business(business_id));

create or replace function public.ensure_point_wallet(target_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.point_wallets (business_id)
  values (target_business_id)
  on conflict (business_id) do nothing;
end;
$$;

create or replace function public.grant_launch_point_bonus(target_business_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_business record;
  new_lot_id uuid;
  bonus_key text := 'launch_bonus:' || target_business_id::text;
begin
  select id, user_id, created_at
  into target_business
  from public.business_profiles
  where id = target_business_id
  for update;

  if not found
    or target_business.user_id is null
    or target_business.created_at > timestamptz '2026-12-31 23:59:59+09'
    or exists (select 1 from public.point_ledger where idempotency_key = bonus_key) then
    return false;
  end if;

  perform public.ensure_point_wallet(target_business_id);

  insert into public.point_lots (
    business_id,
    kind,
    original_points,
    available_points,
    expires_at
  ) values (
    target_business_id,
    'promotional',
    50000,
    50000,
    now() + interval '30 days'
  )
  returning id into new_lot_id;

  update public.point_wallets
  set
    available_points = available_points + 50000,
    lifetime_credited_points = lifetime_credited_points + 50000,
    updated_at = now()
  where business_id = target_business_id;

  insert into public.point_ledger (
    business_id,
    lot_id,
    event_type,
    available_delta,
    idempotency_key,
    memo
  ) values (
    target_business_id,
    new_lot_id,
    'promotional_credit',
    50000,
    bonus_key,
    '2026 첫 출시 무료 캠페인 포인트'
  );

  return true;
end;
$$;

create or replace function public.grant_launch_point_bonus_on_business_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.grant_launch_point_bonus(new.id);
  return new;
end;
$$;

create trigger grant_launch_point_bonus_after_business_insert
after insert on public.business_profiles
for each row execute function public.grant_launch_point_bonus_on_business_insert();

do $$
declare
  target_business record;
begin
  for target_business in
    select id
    from public.business_profiles
    where user_id is not null
  loop
    perform public.grant_launch_point_bonus(target_business.id);
  end loop;
end;
$$;

create or replace function public.expire_business_points(target_business_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_lot record;
  expired_total integer := 0;
begin
  perform public.ensure_point_wallet(target_business_id);

  for expired_lot in
    select id, available_points
    from public.point_lots
    where business_id = target_business_id
      and available_points > 0
      and expires_at <= now()
    order by expires_at, created_at
    for update
  loop
    update public.point_lots
    set
      consumed_points = consumed_points + expired_lot.available_points,
      available_points = 0,
      updated_at = now()
    where id = expired_lot.id;

    insert into public.point_ledger (
      business_id,
      lot_id,
      event_type,
      available_delta,
      idempotency_key,
      memo
    ) values (
      target_business_id,
      expired_lot.id,
      'point_expire',
      -expired_lot.available_points,
      'expire:' || expired_lot.id::text,
      '유효기간 만료'
    )
    on conflict (idempotency_key) do nothing;

    expired_total := expired_total + expired_lot.available_points;
  end loop;

  if expired_total > 0 then
    update public.point_wallets
    set
      available_points = available_points - expired_total,
      updated_at = now()
    where business_id = target_business_id;
  end if;

  return expired_total;
end;
$$;

create or replace function public.get_my_point_wallet()
returns table (
  business_id uuid,
  available_points integer,
  reserved_points integer,
  promotional_points integer,
  paid_points integer,
  next_expiration_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_business_id uuid;
begin
  select id
  into target_business_id
  from public.business_profiles
  where user_id = auth.uid();

  if target_business_id is null then
    raise exception '가게 프로필을 찾을 수 없습니다.';
  end if;

  perform public.expire_business_points(target_business_id);

  return query
  select
    point_wallets.business_id,
    point_wallets.available_points,
    point_wallets.reserved_points,
    coalesce(sum(point_lots.available_points) filter (where point_lots.kind = 'promotional'), 0)::integer,
    coalesce(sum(point_lots.available_points) filter (where point_lots.kind = 'paid'), 0)::integer,
    min(point_lots.expires_at) filter (
      where point_lots.available_points > 0
        and point_lots.kind = 'promotional'
    )
  from public.point_wallets
  left join public.point_lots on point_lots.business_id = point_wallets.business_id
  where point_wallets.business_id = target_business_id
  group by point_wallets.business_id, point_wallets.available_points, point_wallets.reserved_points;
end;
$$;

create or replace function public.create_point_payment_order(
  target_order_id text,
  target_terms_version text
)
returns public.point_payment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  target_business_id uuid;
  created_order public.point_payment_orders;
begin
  if target_order_id !~ '^[A-Za-z0-9_-]{6,64}$' then
    raise exception '올바르지 않은 주문번호입니다.';
  end if;

  select id
  into target_business_id
  from public.business_profiles
  where user_id = auth.uid();

  if target_business_id is null then
    raise exception '가게 계정만 포인트를 충전할 수 있습니다.';
  end if;

  perform public.ensure_point_wallet(target_business_id);

  insert into public.point_payment_orders (
    business_id,
    order_id,
    accepted_terms_version
  ) values (
    target_business_id,
    target_order_id,
    target_terms_version
  )
  returning * into created_order;

  return created_order;
end;
$$;

create or replace function public.mark_point_payment_failed(
  target_order_id text,
  target_code text,
  target_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.point_payment_orders
  set
    status = case when status = 'pending' then 'failed' else status end,
    failure_code = target_code,
    failure_message = target_message,
    updated_at = now()
  where order_id = target_order_id
    and public.owns_business(business_id);
end;
$$;

create or replace function public.credit_point_payment(
  target_order_id text,
  target_payment_key text,
  target_payment_method text,
  target_provider_response jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.point_payment_orders;
  new_lot_id uuid;
begin
  select *
  into target_order
  from public.point_payment_orders
  where order_id = target_order_id
  for update;

  if not found then
    raise exception '포인트 주문을 찾을 수 없습니다.';
  end if;

  if target_order.status in ('paid', 'partially_refunded', 'refunded') then
    if target_order.payment_key <> target_payment_key then
      raise exception '이미 다른 결제로 처리된 주문입니다.';
    end if;
    return false;
  end if;

  if target_order.status not in ('pending', 'failed') then
    raise exception '승인할 수 없는 주문 상태입니다.';
  end if;

  perform public.ensure_point_wallet(target_order.business_id);

  insert into public.point_lots (
    business_id,
    kind,
    payment_order_id,
    original_points,
    available_points,
    expires_at
  ) values (
    target_order.business_id,
    'paid',
    target_order.id,
    target_order.point_amount,
    target_order.point_amount,
    now() + interval '5 years'
  )
  returning id into new_lot_id;

  update public.point_wallets
  set
    available_points = available_points + target_order.point_amount,
    lifetime_credited_points = lifetime_credited_points + target_order.point_amount,
    updated_at = now()
  where business_id = target_order.business_id;

  insert into public.point_ledger (
    business_id,
    lot_id,
    payment_order_id,
    event_type,
    available_delta,
    idempotency_key,
    memo
  ) values (
    target_order.business_id,
    new_lot_id,
    target_order.id,
    'paid_credit',
    target_order.point_amount,
    'payment_credit:' || target_order.order_id,
    '포인트 충전'
  );

  update public.point_payment_orders
  set
    status = 'paid',
    payment_key = target_payment_key,
    payment_method = target_payment_method,
    provider_response = target_provider_response,
    paid_at = coalesce(paid_at, now()),
    failure_code = null,
    failure_message = null,
    updated_at = now()
  where id = target_order.id;

  return true;
end;
$$;

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

  select *
  into target_wallet
  from public.point_wallets
  where business_id = target_campaign.business_id
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
    select id, available_points
    from public.point_lots
    where business_id = target_campaign.business_id
      and available_points > 0
      and expires_at > now()
    order by
      case kind when 'promotional' then 0 when 'admin' then 1 else 2 end,
      expires_at,
      created_at
    for update
  loop
    exit when remaining_points = 0;
    points_taken := least(target_lot.available_points, remaining_points);

    update public.point_lots
    set
      available_points = available_points - points_taken,
      reserved_points = reserved_points + points_taken,
      updated_at = now()
    where id = target_lot.id;

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
    available_points = available_points - points_to_reserve,
    reserved_points = reserved_points + points_to_reserve,
    updated_at = now()
  where business_id = target_campaign.business_id;

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

create or replace function public.release_campaign_point_reservation(
  target_campaign_id uuid,
  target_reason text,
  target_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_reservation public.campaign_point_reservations;
  target_allocation record;
  reusable_points integer := 0;
  returned_now integer;
begin
  select *
  into target_reservation
  from public.campaign_point_reservations
  where campaign_id = target_campaign_id
  for update;

  if not found or target_reservation.status <> 'reserved' then
    return 0;
  end if;

  for target_allocation in
    select
      campaign_point_allocations.lot_id,
      campaign_point_allocations.reserved_points,
      point_lots.kind,
      point_lots.expires_at
    from public.campaign_point_allocations
    join public.point_lots on point_lots.id = campaign_point_allocations.lot_id
    where reservation_campaign_id = target_campaign_id
    for update of point_lots, campaign_point_allocations
  loop
    returned_now := case
      when target_allocation.kind = 'promotional' and target_allocation.expires_at <= now() then 0
      else target_allocation.reserved_points
    end;

    update public.point_lots
    set
      reserved_points = reserved_points - target_allocation.reserved_points,
      available_points = available_points + returned_now,
      consumed_points = consumed_points + (target_allocation.reserved_points - returned_now),
      updated_at = now()
    where id = target_allocation.lot_id;

    update public.campaign_point_allocations
    set returned_points = target_allocation.reserved_points
    where reservation_campaign_id = target_campaign_id
      and lot_id = target_allocation.lot_id;

    reusable_points := reusable_points + returned_now;
  end loop;

  update public.point_wallets
  set
    available_points = available_points + reusable_points,
    reserved_points = reserved_points - target_reservation.reserved_points,
    updated_at = now()
  where business_id = target_reservation.business_id;

  update public.campaign_point_reservations
  set
    status = 'released',
    billable_headcount = 0,
    returned_points = reserved_points,
    settlement_reason = target_reason,
    settled_at = now(),
    updated_at = now()
  where campaign_id = target_campaign_id;

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
    target_reservation.business_id,
    target_campaign_id,
    'campaign_release',
    reusable_points,
    -target_reservation.reserved_points,
    target_idempotency_key,
    target_reason,
    jsonb_build_object(
      'returnedPoints', target_reservation.reserved_points,
      'reusablePoints', reusable_points
    )
  )
  on conflict (idempotency_key) do nothing;

  return reusable_points;
end;
$$;

create or replace function public.settle_campaign_points(
  target_campaign_id uuid,
  target_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_reservation public.campaign_point_reservations;
  target_allocation record;
  valid_application_count integer;
  billable_count integer;
  points_to_consume integer;
  remaining_consume integer;
  consumed_now integer;
  returned_now integer;
  reusable_now integer;
  reusable_total integer := 0;
begin
  select *
  into target_reservation
  from public.campaign_point_reservations
  where campaign_id = target_campaign_id
  for update;

  if not found then
    return 0;
  end if;

  if target_reservation.status <> 'reserved' then
    return coalesce(target_reservation.billable_headcount, 0);
  end if;

  select count(distinct creator_id)
  into valid_application_count
  from public.campaign_applications
  where campaign_id = target_campaign_id
    and status in ('submitted', 'recommended', 'selected');

  billable_count := least(target_reservation.requested_headcount, valid_application_count);
  points_to_consume := billable_count * target_reservation.unit_points;
  remaining_consume := points_to_consume;

  for target_allocation in
    select
      campaign_point_allocations.lot_id,
      campaign_point_allocations.reserved_points,
      point_lots.kind,
      point_lots.expires_at
    from public.campaign_point_allocations
    join public.point_lots on point_lots.id = campaign_point_allocations.lot_id
    where reservation_campaign_id = target_campaign_id
    order by
      case point_lots.kind when 'promotional' then 0 when 'admin' then 1 else 2 end,
      point_lots.expires_at,
      point_lots.created_at
    for update of point_lots, campaign_point_allocations
  loop
    consumed_now := least(target_allocation.reserved_points, remaining_consume);
    returned_now := target_allocation.reserved_points - consumed_now;
    reusable_now := case
      when target_allocation.kind = 'promotional' and target_allocation.expires_at <= now() then 0
      else returned_now
    end;

    update public.point_lots
    set
      reserved_points = reserved_points - target_allocation.reserved_points,
      consumed_points = consumed_points + consumed_now + (returned_now - reusable_now),
      available_points = available_points + reusable_now,
      updated_at = now()
    where id = target_allocation.lot_id;

    update public.campaign_point_allocations
    set
      consumed_points = consumed_now,
      returned_points = returned_now
    where reservation_campaign_id = target_campaign_id
      and lot_id = target_allocation.lot_id;

    remaining_consume := remaining_consume - consumed_now;
    reusable_total := reusable_total + reusable_now;
  end loop;

  update public.point_wallets
  set
    available_points = available_points + reusable_total,
    reserved_points = reserved_points - target_reservation.reserved_points,
    lifetime_spent_points = lifetime_spent_points + points_to_consume,
    updated_at = now()
  where business_id = target_reservation.business_id;

  update public.campaign_point_reservations
  set
    status = 'settled',
    billable_headcount = billable_count,
    consumed_points = points_to_consume,
    returned_points = reserved_points - points_to_consume,
    settlement_reason = case when billable_count = 0 then '유효 신청자 없음' else '모집 마감 정산' end,
    settled_at = now(),
    updated_at = now()
  where campaign_id = target_campaign_id;

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
    target_reservation.business_id,
    target_campaign_id,
    'campaign_settle',
    reusable_total,
    -target_reservation.reserved_points,
    target_idempotency_key,
    '모집 마감 포인트 정산',
    jsonb_build_object(
      'validApplications', valid_application_count,
      'billableHeadcount', billable_count,
      'consumedPoints', points_to_consume,
      'returnedPoints', target_reservation.reserved_points - points_to_consume,
      'reusablePoints', reusable_total
    )
  )
  on conflict (idempotency_key) do nothing;

  return billable_count;
end;
$$;

create or replace function public.cancel_campaign_before_publish(
  target_campaign_id uuid,
  target_idempotency_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign record;
begin
  select campaigns.id, campaigns.business_id, campaigns.status, business_profiles.user_id
  into target_campaign
  from public.campaigns
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaigns.id = target_campaign_id
  for update of campaigns;

  if not found or target_campaign.user_id <> auth.uid() then
    raise exception '캠페인을 찾을 수 없습니다.';
  end if;

  if target_campaign.status not in ('draft', 'in_review', 'revision_requested', 'approved', 'scheduled') then
    raise exception '공개 전 캠페인만 포인트 반환과 함께 취소할 수 있습니다.';
  end if;

  perform public.release_campaign_point_reservation(
    target_campaign_id,
    '공개 전 가게 취소',
    target_idempotency_key
  );

  update public.campaigns
  set status = 'cancelled', updated_at = now()
  where id = target_campaign_id;
end;
$$;

create or replace function public.create_point_refund_request(
  target_order_id text,
  target_refund_id uuid,
  target_idempotency_key text
)
returns public.point_refund_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.point_payment_orders;
  target_lot public.point_lots;
  created_refund public.point_refund_requests;
begin
  select *
  into target_order
  from public.point_payment_orders
  where order_id = target_order_id
  for update;

  if not found or not public.owns_business(target_order.business_id) then
    raise exception '환불할 주문을 찾을 수 없습니다.';
  end if;

  if target_order.status not in ('paid', 'partially_refunded') then
    raise exception '환불할 수 없는 주문 상태입니다.';
  end if;

  perform public.expire_business_points(target_order.business_id);

  select *
  into target_lot
  from public.point_lots
  where payment_order_id = target_order.id
    and kind = 'paid'
  for update;

  if not found or target_lot.available_points <= 0 then
    raise exception '현금으로 환불 가능한 포인트가 없습니다.';
  end if;

  insert into public.point_refund_requests (
    id,
    business_id,
    payment_order_id,
    point_lot_id,
    refund_points,
    refund_amount,
    idempotency_key
  ) values (
    target_refund_id,
    target_order.business_id,
    target_order.id,
    target_lot.id,
    target_lot.available_points,
    (target_lot.available_points * 11) / 10,
    target_idempotency_key
  )
  returning * into created_refund;

  update public.point_lots
  set
    available_points = 0,
    refunded_points = refunded_points + target_lot.available_points,
    updated_at = now()
  where id = target_lot.id;

  update public.point_wallets
  set
    available_points = available_points - target_lot.available_points,
    updated_at = now()
  where business_id = target_order.business_id;

  insert into public.point_ledger (
    business_id,
    lot_id,
    payment_order_id,
    event_type,
    available_delta,
    idempotency_key,
    memo
  ) values (
    target_order.business_id,
    target_lot.id,
    target_order.id,
    'refund_hold',
    -target_lot.available_points,
    'refund_hold:' || target_refund_id::text,
    '유상 포인트 환불 대기'
  );

  return created_refund;
end;
$$;

create or replace function public.complete_point_refund(
  target_refund_id uuid,
  target_provider_response jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_refund public.point_refund_requests;
  target_order public.point_payment_orders;
begin
  select *
  into target_refund
  from public.point_refund_requests
  where id = target_refund_id
  for update;

  if not found then
    raise exception '환불 요청을 찾을 수 없습니다.';
  end if;

  if target_refund.status = 'completed' then
    return false;
  end if;

  if target_refund.status <> 'pending' then
    raise exception '완료할 수 없는 환불 상태입니다.';
  end if;

  select *
  into target_order
  from public.point_payment_orders
  where id = target_refund.payment_order_id
  for update;

  update public.point_refund_requests
  set
    status = 'completed',
    provider_response = target_provider_response,
    completed_at = now()
  where id = target_refund_id;

  update public.point_payment_orders
  set
    refunded_points = refunded_points + target_refund.refund_points,
    status = case
      when refunded_points + target_refund.refund_points >= point_amount then 'refunded'
      else 'partially_refunded'
    end,
    updated_at = now()
  where id = target_order.id;

  insert into public.point_ledger (
    business_id,
    lot_id,
    payment_order_id,
    event_type,
    idempotency_key,
    memo,
    metadata
  ) values (
    target_refund.business_id,
    target_refund.point_lot_id,
    target_refund.payment_order_id,
    'refund_complete',
    'refund_complete:' || target_refund_id::text,
    '유상 포인트 원결제 환불 완료',
    jsonb_build_object('refundPoints', target_refund.refund_points, 'refundAmount', target_refund.refund_amount)
  )
  on conflict (idempotency_key) do nothing;

  return true;
end;
$$;

create or replace function public.fail_point_refund(
  target_refund_id uuid,
  target_failure_message text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_refund public.point_refund_requests;
begin
  select *
  into target_refund
  from public.point_refund_requests
  where id = target_refund_id
  for update;

  if not found or target_refund.status <> 'pending' then
    return false;
  end if;

  update public.point_lots
  set
    available_points = available_points + target_refund.refund_points,
    refunded_points = refunded_points - target_refund.refund_points,
    updated_at = now()
  where id = target_refund.point_lot_id;

  update public.point_wallets
  set
    available_points = available_points + target_refund.refund_points,
    updated_at = now()
  where business_id = target_refund.business_id;

  update public.point_refund_requests
  set
    status = 'failed',
    failure_message = target_failure_message,
    completed_at = now()
  where id = target_refund_id;

  insert into public.point_ledger (
    business_id,
    lot_id,
    payment_order_id,
    event_type,
    available_delta,
    idempotency_key,
    memo
  ) values (
    target_refund.business_id,
    target_refund.point_lot_id,
    target_refund.payment_order_id,
    'refund_restore',
    target_refund.refund_points,
    'refund_restore:' || target_refund_id::text,
    target_failure_message
  )
  on conflict (idempotency_key) do nothing;

  return true;
end;
$$;

create or replace function public.sync_expired_campaigns()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_campaign record;
  updated_count integer := 0;
  billable_count integer;
begin
  for expired_campaign in
    select id, billing_mode
    from public.campaigns
    where status = 'recruiting'
      and recruit_end is not null
      and recruit_end < ((now() at time zone 'Asia/Seoul')::date)
    for update
  loop
    if expired_campaign.billing_mode = 'points_v1' then
      billable_count := public.settle_campaign_points(
        expired_campaign.id,
        'campaign_settle:' || expired_campaign.id::text
      );

      update public.campaigns
      set
        status = case when billable_count = 0 then 'failed'::public.campaign_status else 'selecting'::public.campaign_status end,
        updated_at = now()
      where id = expired_campaign.id;
    else
      update public.campaigns
      set status = 'selecting', updated_at = now()
      where id = expired_campaign.id;
    end if;

    updated_count := updated_count + 1;
  end loop;

  return updated_count;
end;
$$;

create or replace function public.select_campaign_application(target_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_application record;
  current_selected_count integer;
  selection_target_count integer;
  new_collaboration_id uuid;
begin
  if not public.current_user_has_role('business') then
    raise exception '가게 계정만 지원자를 선정할 수 있습니다.';
  end if;

  select
    campaign_applications.id as application_id,
    campaign_applications.campaign_id,
    campaign_applications.creator_id,
    campaign_applications.status as application_status,
    campaigns.status as campaign_status,
    campaigns.recruit_count,
    campaigns.submission_due,
    campaigns.billing_mode,
    business_profiles.user_id as business_user_id
  into selected_application
  from public.campaign_applications
  join public.campaigns on campaigns.id = campaign_applications.campaign_id
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaign_applications.id = target_application_id
  for update of campaign_applications, campaigns;

  if not found then
    raise exception '지원서를 찾을 수 없습니다.';
  end if;

  if selected_application.business_user_id <> auth.uid() then
    raise exception '해당 캠페인의 가게 계정만 선정할 수 있습니다.';
  end if;

  if selected_application.application_status not in ('submitted', 'recommended') then
    raise exception '신규 또는 추천 상태의 지원서만 선정할 수 있습니다.';
  end if;

  if selected_application.campaign_status <> 'selecting' then
    raise exception '모집 종료 후 선정중 상태에서만 선정할 수 있습니다.';
  end if;

  select count(*)
  into current_selected_count
  from public.collaborations
  where campaign_id = selected_application.campaign_id
    and status <> 'cancelled';

  if current_selected_count >= selected_application.recruit_count then
    raise exception '선정 정원이 마감되었습니다.';
  end if;

  if exists (
    select 1
    from public.collaborations
    where status <> 'cancelled'
      and (
        application_id = selected_application.application_id
        or (
          campaign_id = selected_application.campaign_id
          and creator_id = selected_application.creator_id
        )
      )
  ) then
    raise exception '이미 생성된 협업입니다.';
  end if;

  insert into public.collaborations (
    campaign_id,
    creator_id,
    application_id,
    submission_due,
    status
  ) values (
    selected_application.campaign_id,
    selected_application.creator_id,
    selected_application.application_id,
    selected_application.submission_due,
    'selected'
  )
  returning id into new_collaboration_id;

  update public.campaign_applications
  set status = 'selected'
  where id = selected_application.application_id;

  if selected_application.billing_mode = 'points_v1' then
    select coalesce(billable_headcount, selected_application.recruit_count)
    into selection_target_count
    from public.campaign_point_reservations
    where campaign_id = selected_application.campaign_id;
  else
    selection_target_count := selected_application.recruit_count;
  end if;

  if current_selected_count + 1 >= selection_target_count then
    update public.campaign_applications
    set status = 'rejected'
    where campaign_id = selected_application.campaign_id
      and status in ('submitted', 'recommended');

    update public.campaigns
    set status = 'in_progress', updated_at = now()
    where id = selected_application.campaign_id;
  end if;

  return new_collaboration_id;
end;
$$;

create or replace function public.finalize_campaign_selection(target_campaign_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_campaign record;
  selected_count integer;
begin
  if not public.current_user_has_role('business') then
    raise exception '가게 계정만 선정을 완료할 수 있습니다.';
  end if;

  select campaigns.id, campaigns.status, business_profiles.user_id
  into target_campaign
  from public.campaigns
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaigns.id = target_campaign_id
  for update of campaigns;

  if not found or target_campaign.user_id <> auth.uid() then
    raise exception '캠페인을 찾을 수 없습니다.';
  end if;

  if target_campaign.status <> 'selecting' then
    raise exception '선정중인 캠페인만 선정을 완료할 수 있습니다.';
  end if;

  select count(*)
  into selected_count
  from public.collaborations
  where campaign_id = target_campaign_id
    and status <> 'cancelled';

  if selected_count <= 0 then
    raise exception '한 명 이상 선정한 뒤 완료해주세요.';
  end if;

  update public.campaign_applications
  set status = 'rejected'
  where campaign_id = target_campaign_id
    and status in ('submitted', 'recommended');

  update public.campaigns
  set status = 'in_progress', updated_at = now()
  where id = target_campaign_id;

  return selected_count;
end;
$$;

create or replace function public.admin_reject_campaign(
  target_campaign_id uuid,
  target_reason text,
  target_idempotency_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_status public.campaign_status;
begin
  if not public.is_admin() then
    raise exception '관리자만 캠페인을 반려할 수 있습니다.';
  end if;

  select status
  into target_status
  from public.campaigns
  where id = target_campaign_id
  for update;

  if not found or target_status not in ('in_review', 'revision_requested', 'approved', 'scheduled') then
    raise exception '공개 전 검수 캠페인만 반려할 수 있습니다.';
  end if;

  perform public.release_campaign_point_reservation(
    target_campaign_id,
    target_reason,
    target_idempotency_key
  );

  update public.campaigns
  set
    status = 'cancelled',
    admin_memo = target_reason,
    updated_at = now()
  where id = target_campaign_id;
end;
$$;

create or replace function public.admin_adjust_business_points(
  target_business_id uuid,
  target_points integer,
  target_reason text,
  target_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_lot_id uuid;
  target_wallet public.point_wallets;
  target_lot record;
  remaining_debit integer;
  points_taken integer;
  current_balance integer;
begin
  if not public.is_admin() then
    raise exception '관리자만 포인트를 조정할 수 있습니다.';
  end if;

  if target_points = 0
    or mod(abs(target_points), 5000) <> 0
    or abs(target_points) > 500000
    or length(trim(target_reason)) < 2 then
    raise exception '조정 포인트와 사유를 입력해주세요.';
  end if;

  if exists (select 1 from public.point_ledger where idempotency_key = target_idempotency_key) then
    select available_points
    into current_balance
    from public.point_wallets
    where business_id = target_business_id;
    return coalesce(current_balance, 0);
  end if;

  perform public.ensure_point_wallet(target_business_id);
  perform public.expire_business_points(target_business_id);

  select *
  into target_wallet
  from public.point_wallets
  where business_id = target_business_id
  for update;

  if target_points > 0 then
    insert into public.point_lots (
      business_id,
      kind,
      original_points,
      available_points,
      expires_at
    ) values (
      target_business_id,
      'admin',
      target_points,
      target_points,
      now() + interval '5 years'
    )
    returning id into new_lot_id;

    update public.point_wallets
    set
      available_points = available_points + target_points,
      lifetime_credited_points = lifetime_credited_points + target_points,
      updated_at = now()
    where business_id = target_business_id;

    insert into public.point_ledger (
      business_id,
      lot_id,
      event_type,
      available_delta,
      idempotency_key,
      memo
    ) values (
      target_business_id,
      new_lot_id,
      'admin_credit',
      target_points,
      target_idempotency_key,
      target_reason
    );
  else
    if target_wallet.available_points < abs(target_points) then
      raise exception '차감할 수 있는 포인트가 부족합니다.';
    end if;

    remaining_debit := abs(target_points);
    for target_lot in
      select id, available_points
      from public.point_lots
      where business_id = target_business_id
        and available_points > 0
        and expires_at > now()
      order by
        case kind when 'promotional' then 0 when 'admin' then 1 else 2 end,
        expires_at,
        created_at
      for update
    loop
      exit when remaining_debit = 0;
      points_taken := least(target_lot.available_points, remaining_debit);
      update public.point_lots
      set
        available_points = available_points - points_taken,
        consumed_points = consumed_points + points_taken,
        updated_at = now()
      where id = target_lot.id;
      remaining_debit := remaining_debit - points_taken;
    end loop;

    update public.point_wallets
    set
      available_points = available_points + target_points,
      lifetime_spent_points = lifetime_spent_points + abs(target_points),
      updated_at = now()
    where business_id = target_business_id;

    insert into public.point_ledger (
      business_id,
      event_type,
      available_delta,
      idempotency_key,
      memo
    ) values (
      target_business_id,
      'admin_debit',
      target_points,
      target_idempotency_key,
      target_reason
    );
  end if;

  return target_wallet.available_points + target_points;
end;
$$;

drop policy if exists "business owners manage campaigns" on public.campaigns;

create policy "admins manage all campaigns" on public.campaigns
for all using (public.is_admin()) with check (public.is_admin());

create policy "business owners read own campaigns" on public.campaigns
for select using (
  public.current_user_has_role('business')
  and exists (
    select 1
    from public.business_profiles
    where business_profiles.id = campaigns.business_id
      and business_profiles.user_id = auth.uid()
  )
);

create policy "business owners insert campaign drafts" on public.campaigns
for insert with check (
  public.current_user_has_role('business')
  and status = 'draft'
  and billing_mode = 'points_v1'
  and exists (
    select 1
    from public.business_profiles
    where business_profiles.id = campaigns.business_id
      and business_profiles.user_id = auth.uid()
  )
);

create policy "business owners update editable campaign drafts" on public.campaigns
for update using (
  public.current_user_has_role('business')
  and status in ('draft', 'revision_requested')
  and exists (
    select 1
    from public.business_profiles
    where business_profiles.id = campaigns.business_id
      and business_profiles.user_id = auth.uid()
  )
) with check (
  status in ('draft', 'revision_requested')
  and exists (
    select 1
    from public.business_profiles
    where business_profiles.id = campaigns.business_id
      and business_profiles.user_id = auth.uid()
  )
);

create policy "business owners delete unsubmitted drafts" on public.campaigns
for delete using (
  public.current_user_has_role('business')
  and status = 'draft'
  and exists (
    select 1
    from public.business_profiles
    where business_profiles.id = campaigns.business_id
      and business_profiles.user_id = auth.uid()
  )
);

drop policy if exists "public can read visible campaigns" on public.campaigns;
create policy "public can read visible campaigns" on public.campaigns
for select using (
  status in ('recruiting', 'selecting', 'in_progress', 'submission_review', 'completed')
  or (status in ('cancelled', 'failed') and recruit_start is not null)
  or public.is_admin()
);

revoke all on function public.ensure_point_wallet(uuid) from public;
revoke all on function public.grant_launch_point_bonus(uuid) from public;
revoke all on function public.expire_business_points(uuid) from public;
revoke all on function public.get_my_point_wallet() from public;
revoke all on function public.create_point_payment_order(text, text) from public;
revoke all on function public.mark_point_payment_failed(text, text, text) from public;
revoke all on function public.credit_point_payment(text, text, text, jsonb) from public;
revoke all on function public.submit_campaign_for_review(uuid, text) from public;
revoke all on function public.release_campaign_point_reservation(uuid, text, text) from public;
revoke all on function public.settle_campaign_points(uuid, text) from public;
revoke all on function public.cancel_campaign_before_publish(uuid, text) from public;
revoke all on function public.create_point_refund_request(text, uuid, text) from public;
revoke all on function public.complete_point_refund(uuid, jsonb) from public;
revoke all on function public.fail_point_refund(uuid, text) from public;
revoke all on function public.finalize_campaign_selection(uuid) from public;
revoke all on function public.admin_reject_campaign(uuid, text, text) from public;
revoke all on function public.admin_adjust_business_points(uuid, integer, text, text) from public;

grant execute on function public.get_my_point_wallet() to authenticated;
grant execute on function public.create_point_payment_order(text, text) to authenticated;
grant execute on function public.mark_point_payment_failed(text, text, text) to authenticated;
grant execute on function public.submit_campaign_for_review(uuid, text) to authenticated;
grant execute on function public.cancel_campaign_before_publish(uuid, text) to authenticated;
grant execute on function public.create_point_refund_request(text, uuid, text) to authenticated;
grant execute on function public.finalize_campaign_selection(uuid) to authenticated;
grant execute on function public.admin_reject_campaign(uuid, text, text) to authenticated;
grant execute on function public.admin_adjust_business_points(uuid, integer, text, text) to authenticated;
grant execute on function public.credit_point_payment(text, text, text, jsonb) to service_role;
grant execute on function public.complete_point_refund(uuid, jsonb) to service_role;
grant execute on function public.fail_point_refund(uuid, text) to service_role;
grant execute on function public.select_campaign_application(uuid) to authenticated;
grant execute on function public.sync_expired_campaigns() to anon, authenticated;
