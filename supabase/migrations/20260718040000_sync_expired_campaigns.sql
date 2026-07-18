create or replace function public.sync_expired_campaigns()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.campaigns
  set
    status = 'selecting',
    updated_at = now()
  where status = 'recruiting'
    and recruit_end is not null
    and recruit_end < ((now() at time zone 'Asia/Seoul')::date);

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

grant execute on function public.sync_expired_campaigns() to anon, authenticated;
