-- 홈의 '참여 크리에이터'를 인증 여부와 무관하게 가입한 크리에이터 전부로 센다.
-- 가입은 했지만 아직 인증 심사를 기다리는 사람도 이미 이 서비스에 들어와 있는
-- 사람이고, 가게가 궁금해하는 것도 '얼마나 많은 크리에이터가 여기 있나'다.
--
-- 정지된 계정만 뺀다. 활동할 수 없는 계정까지 세면 숫자가 사실과 멀어진다.

create or replace function public.get_public_home_stats()
returns table (
  campaigns integer,
  creators integer,
  businesses integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(*)
      from public.campaigns
      where status in ('recruiting', 'selecting', 'in_progress', 'submission_review', 'completed')
    )::integer,
    (
      select count(*)
      from public.profiles
      where role = 'creator'
        and status = 'active'
    )::integer,
    (
      select count(*)
      from public.business_profiles
      where verification_status = 'verified'
    )::integer;
$$;

revoke all on function public.get_public_home_stats() from public;
grant execute on function public.get_public_home_stats() to anon, authenticated;
