create or replace function public.get_public_coupons(target_coupon_id uuid default null)
returns table (
  id uuid,
  business_id uuid,
  title text,
  description text,
  cover_image_url text,
  benefit_type text,
  benefit_value text,
  terms text,
  total_quantity integer,
  claimed_quantity integer,
  start_date date,
  end_date date,
  status public.coupon_review_status,
  redemption_code_configured boolean,
  created_at timestamptz,
  business_name text,
  business_category text,
  business_address text,
  business_address_detail text,
  business_contact text,
  business_cover_image_url text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    coupon.id,
    coupon.business_id,
    coupon.title,
    coupon.description,
    coupon.cover_image_url,
    coupon.benefit_type,
    coupon.benefit_value,
    coupon.terms,
    coupon.total_quantity,
    coupon.claimed_quantity,
    coupon.start_date,
    coupon.end_date,
    coupon.status,
    coupon.redemption_code_configured,
    coupon.created_at,
    business.business_name,
    business.category,
    business.address,
    business.address_detail,
    business.contact,
    business.cover_image_url
  from public.coupons coupon
  join public.business_profiles business on business.id = coupon.business_id
  where coupon.status = 'approved'
    and (target_coupon_id is null or coupon.id = target_coupon_id)
  order by coupon.created_at desc;
$$;

revoke all on function public.get_public_coupons(uuid) from public;
grant execute on function public.get_public_coupons(uuid) to anon, authenticated;
