alter table public.campaigns
add column if not exists latitude numeric,
add column if not exists longitude numeric;
