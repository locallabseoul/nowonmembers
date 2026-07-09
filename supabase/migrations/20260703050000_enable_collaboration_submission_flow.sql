create policy "creators read own collaborations" on public.collaborations
for select using (
  public.is_admin()
  or exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = collaborations.creator_id
      and creator_profiles.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.campaigns
    join public.business_profiles on business_profiles.id = campaigns.business_id
    where campaigns.id = collaborations.campaign_id
      and business_profiles.user_id = auth.uid()
  )
);

create policy "creators read submissions for own collaborations" on public.content_submissions
for select using (
  public.is_admin()
  or exists (
    select 1
    from public.collaborations
    join public.creator_profiles on creator_profiles.id = collaborations.creator_id
    where collaborations.id = content_submissions.collaboration_id
      and creator_profiles.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.collaborations
    join public.campaigns on campaigns.id = collaborations.campaign_id
    join public.business_profiles on business_profiles.id = campaigns.business_id
    where collaborations.id = content_submissions.collaboration_id
      and business_profiles.user_id = auth.uid()
  )
);
