alter table public.business_profiles
add column if not exists address_detail text;

alter table public.campaigns
add column if not exists region_detail text;
