-- Public/member reads use explicit projections. Owners/admins retain management reads.
drop policy "public reads approved coupons" on public.coupons;
create policy "owners and admins read coupon records" on public.coupons
for select to authenticated using (
  public.is_admin()
  or exists (
    select 1 from public.business_profiles business
    where business.id = coupons.business_id and business.user_id = auth.uid()
  )
);

-- No caller-supplied member ID. Preserve own history even after coupon withdrawal.
-- Only the limited business fields already published with the coupon are included.
create function public.get_my_coupon_claims()
returns table (
  id uuid, status public.coupon_claim_status,
  failed_redemption_attempts integer, redemption_locked_until timestamptz,
  claimed_at timestamptz, redeemed_at timestamptz, cancelled_at timestamptz,
  coupon jsonb
)
language sql stable security definer set search_path = ''
as $$
  select claim.id, claim.status, claim.failed_redemption_attempts,
    claim.redemption_locked_until, claim.claimed_at, claim.redeemed_at, claim.cancelled_at,
    jsonb_build_object(
      'id', c.id, 'business_id', c.business_id, 'title', c.title,
      'description', c.description, 'cover_image_url', c.cover_image_url,
      'benefit_type', c.benefit_type, 'benefit_value', c.benefit_value,
      'terms', c.terms, 'total_quantity', c.total_quantity,
      'claimed_quantity', c.claimed_quantity, 'start_date', c.start_date,
      'end_date', c.end_date, 'status', c.status,
      'redemption_code_configured', c.redemption_code_configured,
      'created_at', c.created_at,
      'business_name', b.business_name, 'business_category', b.category,
      'business_address', b.address, 'business_address_detail', b.address_detail,
      'business_contact', b.contact, 'business_cover_image_url', b.cover_image_url
    )
  from public.coupon_claims claim
  join public.coupons c on c.id = claim.coupon_id
  join public.business_profiles b on b.id = c.business_id
  where claim.user_id = auth.uid()
  order by claim.claimed_at desc, claim.id;
$$;
revoke all on function public.get_my_coupon_claims() from public, anon;
grant execute on function public.get_my_coupon_claims() to authenticated;
