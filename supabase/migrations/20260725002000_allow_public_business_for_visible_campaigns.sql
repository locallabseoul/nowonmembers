drop policy if exists "public can read public business profiles" on public.business_profiles;

create policy "public can read public business profiles" on public.business_profiles
for select using (
  is_public = true
  or user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.campaigns
    where campaigns.business_id = business_profiles.id
      and campaigns.status in (
        'recruiting',
        'selecting',
        'in_progress',
        'submission_review',
        'completed',
        'cancelled',
        'failed'
      )
  )
);
