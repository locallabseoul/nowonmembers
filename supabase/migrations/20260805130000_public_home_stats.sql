-- 홈 지표를 가입자(profiles) 기준으로 바꿨더니 비로그인 방문자에게 크리에이터
-- 수가 0으로 보였다. profiles는 본인 행과 관리자만 읽을 수 있어서다. 로그인한
-- 관리자에게만 제대로 보이니 화면마다 숫자가 달라 보였다.
--
-- 정책을 열면 회원 목록 전체가 공개된다. 숫자만 돌려주는 함수를 열어 개인정보는
-- 그대로 두고 집계만 공개한다.
--
-- 매장 수도 함께 옮긴다. business_profiles는 공개 캠페인이 있어야 읽히므로,
-- 캠페인을 아직 올리지 않은 인증 매장이 집계에서 빠지고 있었다.

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
        and verification_status = 'verified'
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
