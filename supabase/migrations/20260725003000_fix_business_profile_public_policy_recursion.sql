create or replace function public.business_profile_has_visible_campaign(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.campaigns
    where campaigns.business_id = target_business_id
      and campaigns.status in (
        'recruiting',
        'selecting',
        'in_progress',
        'submission_review',
        'completed',
        'cancelled',
        'failed'
      )
  );
$$;

revoke all on function public.business_profile_has_visible_campaign(uuid) from public;
grant execute on function public.business_profile_has_visible_campaign(uuid) to anon, authenticated;

drop policy if exists "public can read public business profiles" on public.business_profiles;

create policy "public can read public business profiles" on public.business_profiles
for select using (
  is_public = true
  or user_id = auth.uid()
  or public.is_admin()
  or public.business_profile_has_visible_campaign(id)
);
