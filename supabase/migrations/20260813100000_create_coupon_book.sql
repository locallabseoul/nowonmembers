create type public.coupon_review_status as enum (
  'draft',
  'in_review',
  'revision_requested',
  'approved',
  'cancelled'
);

create type public.coupon_claim_status as enum ('issued', 'redeemed', 'cancelled');

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text,
  cover_image_url text,
  benefit_type text not null check (benefit_type in ('fixed_amount', 'percentage', 'free_item', 'other')),
  benefit_value text not null,
  terms text not null,
  total_quantity integer not null check (total_quantity between 1 and 100000),
  claimed_quantity integer not null default 0 check (claimed_quantity >= 0 and claimed_quantity <= total_quantity),
  claim_start date not null,
  claim_end date not null,
  use_start date not null,
  use_end date not null,
  status public.coupon_review_status not null default 'draft',
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (claim_start <= claim_end),
  check (claim_end <= use_end),
  check (use_start <= use_end)
);

create table public.coupon_claims (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  redemption_code text not null unique,
  status public.coupon_claim_status not null default 'issued',
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz,
  cancelled_at timestamptz,
  redeemed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index coupon_claims_one_active_per_member
on public.coupon_claims (coupon_id, user_id)
where status in ('issued', 'redeemed');

create index coupons_public_list_idx on public.coupons (status, claim_end desc, created_at desc);
create index coupons_business_idx on public.coupons (business_id, created_at desc);
create index coupon_claims_user_idx on public.coupon_claims (user_id, claimed_at desc);
create index coupon_claims_coupon_idx on public.coupon_claims (coupon_id, status);

alter table public.coupons enable row level security;
alter table public.coupon_claims enable row level security;

create policy "public reads approved coupons" on public.coupons
for select using (
  status = 'approved'
  or public.is_admin()
  or exists (
    select 1 from public.business_profiles business
    where business.id = coupons.business_id and business.user_id = auth.uid()
  )
);

create policy "business creates own coupons" on public.coupons
for insert to authenticated
with check (
  status = 'draft'
  and exists (
    select 1 from public.business_profiles business
    where business.id = coupons.business_id and business.user_id = auth.uid()
  )
);

create policy "business updates editable own coupons" on public.coupons
for update to authenticated
using (
  status in ('draft', 'revision_requested')
  and exists (
    select 1 from public.business_profiles business
    where business.id = coupons.business_id and business.user_id = auth.uid()
  )
)
with check (
  status in ('draft', 'revision_requested', 'in_review')
  and exists (
    select 1 from public.business_profiles business
    where business.id = coupons.business_id and business.user_id = auth.uid()
  )
);

create policy "admins manage coupons" on public.coupons
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "members read own coupon claims" on public.coupon_claims
for select to authenticated using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.coupons coupon
    join public.business_profiles business on business.id = coupon.business_id
    where coupon.id = coupon_claims.coupon_id and business.user_id = auth.uid()
  )
);

create policy "admins manage coupon claims" on public.coupon_claims
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.claim_coupon(target_coupon_id uuid)
returns table (claim_id uuid, redemption_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_coupon public.coupons%rowtype;
  generated_code text;
  created_id uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and status = 'active') then
    raise exception '활성 회원만 쿠폰을 받을 수 있습니다.';
  end if;

  select * into target_coupon from public.coupons where id = target_coupon_id for update;
  if not found or target_coupon.status <> 'approved' then raise exception '발급할 수 없는 쿠폰입니다.'; end if;
  if (now() at time zone 'Asia/Seoul')::date < target_coupon.claim_start
    or (now() at time zone 'Asia/Seoul')::date > target_coupon.claim_end then
    raise exception '쿠폰 발급 기간이 아닙니다.';
  end if;
  if target_coupon.claimed_quantity >= target_coupon.total_quantity then raise exception '쿠폰이 모두 소진되었습니다.'; end if;
  if exists (
    select 1 from public.coupon_claims
    where coupon_id = target_coupon_id and user_id = auth.uid() and status in ('issued', 'redeemed')
  ) then raise exception '이미 받은 쿠폰입니다.'; end if;

  loop
    generated_code := upper(encode(extensions.gen_random_bytes(6), 'hex'));
    exit when not exists (select 1 from public.coupon_claims where coupon_claims.redemption_code = generated_code);
  end loop;

  insert into public.coupon_claims (coupon_id, user_id, redemption_code)
  values (target_coupon_id, auth.uid(), generated_code)
  returning id into created_id;

  update public.coupons set claimed_quantity = claimed_quantity + 1, updated_at = now()
  where id = target_coupon_id;

  return query select created_id, generated_code;
end;
$$;

create or replace function public.cancel_coupon_claim(target_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_claim public.coupon_claims%rowtype;
  target_coupon public.coupons%rowtype;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and status = 'active') then
    raise exception '활성 회원만 쿠폰을 취소할 수 있습니다.';
  end if;
  select * into target_claim from public.coupon_claims
  where id = target_claim_id and user_id = auth.uid() for update;
  if not found or target_claim.status <> 'issued' then raise exception '취소할 수 없는 쿠폰입니다.'; end if;

  select * into target_coupon from public.coupons where id = target_claim.coupon_id for update;
  if (now() at time zone 'Asia/Seoul')::date >= target_coupon.use_start then
    raise exception '사용 기간이 시작된 쿠폰은 취소할 수 없습니다.';
  end if;

  update public.coupon_claims
  set status = 'cancelled', cancelled_at = now(), updated_at = now()
  where id = target_claim.id;
  update public.coupons
  set claimed_quantity = greatest(claimed_quantity - 1, 0), updated_at = now()
  where id = target_coupon.id;
end;
$$;

create or replace function public.redeem_coupon_claim(target_claim_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_claim public.coupon_claims%rowtype;
  target_coupon public.coupons%rowtype;
begin
  if not public.current_user_has_role('business'::public.user_role) then
    raise exception '활성 가게 계정만 쿠폰을 사용할 수 있습니다.';
  end if;
  select * into target_claim from public.coupon_claims where id = target_claim_id for update;
  if not found or target_claim.status <> 'issued' then raise exception '사용할 수 없는 쿠폰입니다.'; end if;
  select * into target_coupon from public.coupons where id = target_claim.coupon_id;

  if not exists (
    select 1 from public.business_profiles business
    where business.id = target_coupon.business_id and business.user_id = auth.uid()
  ) then raise exception '이 쿠폰을 발행한 가게만 사용할 수 있습니다.'; end if;
  if target_coupon.status <> 'approved'
    or (now() at time zone 'Asia/Seoul')::date < target_coupon.use_start
    or (now() at time zone 'Asia/Seoul')::date > target_coupon.use_end then
    raise exception '쿠폰 사용 기간이 아닙니다.';
  end if;

  update public.coupon_claims
  set status = 'redeemed', redeemed_at = now(), redeemed_by = auth.uid(), updated_at = now()
  where id = target_claim.id;
end;
$$;

create or replace function public.lookup_coupon_claim(target_code text)
returns table (
  claim_id uuid,
  coupon_title text,
  member_name text,
  claim_status public.coupon_claim_status,
  use_start date,
  use_end date
)
language sql
security definer
set search_path = public
stable
as $$
  select
    claim.id,
    coupon.title,
    coalesce(profile.nickname, profile.name, '노원멤버스 회원'),
    claim.status,
    coupon.use_start,
    coupon.use_end
  from public.coupon_claims claim
  join public.coupons coupon on coupon.id = claim.coupon_id
  join public.business_profiles business on business.id = coupon.business_id
  join public.profiles profile on profile.id = claim.user_id
  where claim.redemption_code = upper(regexp_replace(target_code, '[^A-Za-z0-9]', '', 'g'))
    and business.user_id = auth.uid()
    and public.current_user_has_role('business'::public.user_role)
  limit 1
$$;

revoke all on function public.claim_coupon(uuid) from public;
revoke all on function public.cancel_coupon_claim(uuid) from public;
revoke all on function public.redeem_coupon_claim(uuid) from public;
revoke all on function public.lookup_coupon_claim(text) from public;
grant execute on function public.claim_coupon(uuid) to authenticated;
grant execute on function public.cancel_coupon_claim(uuid) to authenticated;
grant execute on function public.redeem_coupon_claim(uuid) to authenticated;
grant execute on function public.lookup_coupon_claim(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coupon-images', 'coupon-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public read coupon images" on storage.objects
for select to public using (bucket_id = 'coupon-images');

create policy "business users upload coupon images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'coupon-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_user_has_role('business'::public.user_role)
);

create policy "business users manage own coupon images" on storage.objects
for update to authenticated
using (bucket_id = 'coupon-images' and owner = auth.uid())
with check (bucket_id = 'coupon-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "business users delete own coupon images" on storage.objects
for delete to authenticated using (bucket_id = 'coupon-images' and owner = auth.uid());
