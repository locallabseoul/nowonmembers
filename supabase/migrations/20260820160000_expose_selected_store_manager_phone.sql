-- 매장 담당자의 로그인 휴대폰 번호는 개인정보이므로 공개 프로필 조인으로 노출하지 않는다.
-- 로그인한 크리에이터 본인의 활성 협업에 대해서만, Supabase에서 인증 완료된 번호를 반환한다.
drop function if exists public.get_my_collaboration_store_phones(uuid);

create or replace function public.get_my_collaboration_store_phones(
  target_collaboration_id uuid default null,
  target_creator_user_id uuid default null
)
returns table (collaboration_id uuid, manager_phone text)
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    collaborations.id,
    profiles.phone
  from public.collaborations
  join public.creator_profiles
    on creator_profiles.id = collaborations.creator_id
  join public.campaigns
    on campaigns.id = collaborations.campaign_id
  join public.business_profiles
    on business_profiles.id = campaigns.business_id
  join public.profiles
    on profiles.id = business_profiles.user_id
  join auth.users
    on users.id = profiles.id
  where (
      (target_creator_user_id is null and creator_profiles.user_id = auth.uid())
      or (
        target_creator_user_id is not null
        and public.is_admin()
        and creator_profiles.user_id = target_creator_user_id
      )
    )
    and users.phone_confirmed_at is not null
    and profiles.phone is not null
    and btrim(profiles.phone) <> ''
    and collaborations.status not in ('completed', 'no_show', 'cancelled')
    and (target_collaboration_id is null or collaborations.id = target_collaboration_id);
$$;

revoke all on function public.get_my_collaboration_store_phones(uuid, uuid) from public;
grant execute on function public.get_my_collaboration_store_phones(uuid, uuid) to authenticated;
