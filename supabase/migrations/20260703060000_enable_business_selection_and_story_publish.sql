create policy "business owners select recommended applications" on public.campaign_applications
for update using (
  exists (
    select 1
    from public.campaigns
    join public.business_profiles on business_profiles.id = campaigns.business_id
    where campaigns.id = campaign_applications.campaign_id
      and business_profiles.user_id = auth.uid()
      and campaign_applications.status = 'recommended'
  )
) with check (
  exists (
    select 1
    from public.campaigns
    join public.business_profiles on business_profiles.id = campaigns.business_id
    where campaigns.id = campaign_applications.campaign_id
      and business_profiles.user_id = auth.uid()
      and campaign_applications.status in ('selected', 'rejected')
  )
);

create policy "business owners create collaborations from selected applications" on public.collaborations
for insert with check (
  exists (
    select 1
    from public.campaigns
    join public.business_profiles on business_profiles.id = campaigns.business_id
    where campaigns.id = collaborations.campaign_id
      and business_profiles.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.campaign_applications
    where campaign_applications.id = collaborations.application_id
      and campaign_applications.campaign_id = collaborations.campaign_id
      and campaign_applications.creator_id = collaborations.creator_id
      and campaign_applications.status = 'recommended'
  )
);
