-- Resident app projection. This does not widen the base table grants or RLS.
create or replace function public.get_resident_app_businesses(
  target_business_id uuid default null,
  page_size integer default 20,
  page_offset integer default 0
)
returns table (
  id uuid,
  business_name text,
  category text,
  short_intro text,
  description text,
  district text,
  address text,
  address_detail text,
  latitude numeric,
  longitude numeric,
  cover_image_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.business_name, b.category, b.short_intro, b.description,
    b.district, b.address, b.address_detail, b.latitude, b.longitude, b.cover_image_url
  from public.business_profiles b
  join public.profiles owner on owner.id = b.user_id
  where b.is_public = true
    and owner.status = 'active'
    and (target_business_id is null or b.id = target_business_id)
  order by b.created_at desc, b.id
  limit greatest(1, least(coalesce(page_size, 20), 50))
  offset greatest(0, coalesce(page_offset, 0));
$$;

revoke all on function public.get_resident_app_businesses(uuid, integer, integer) from public;
grant execute on function public.get_resident_app_businesses(uuid, integer, integer) to anon, authenticated;
