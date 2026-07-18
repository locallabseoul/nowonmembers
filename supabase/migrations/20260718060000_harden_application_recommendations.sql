with ranked_application_collaborations as (
  select
    collaborations.id,
    row_number() over (
      partition by collaborations.application_id
      order by
        exists (
          select 1
          from public.content_submissions
          where content_submissions.collaboration_id = collaborations.id
        ) desc,
        collaborations.created_at asc
    ) as duplicate_rank
  from public.collaborations
  where collaborations.application_id is not null
    and collaborations.status <> 'cancelled'
)
update public.collaborations
set
  status = 'cancelled',
  cancellation_reason = coalesce(cancellation_reason, '중복 협업 자동 정리')
where id in (
  select id
  from ranked_application_collaborations
  where duplicate_rank > 1
);

with ranked_creator_collaborations as (
  select
    collaborations.id,
    row_number() over (
      partition by collaborations.campaign_id, collaborations.creator_id
      order by
        exists (
          select 1
          from public.content_submissions
          where content_submissions.collaboration_id = collaborations.id
        ) desc,
        collaborations.created_at asc
    ) as duplicate_rank
  from public.collaborations
  where collaborations.status <> 'cancelled'
)
update public.collaborations
set
  status = 'cancelled',
  cancellation_reason = coalesce(cancellation_reason, '중복 협업 자동 정리')
where id in (
  select id
  from ranked_creator_collaborations
  where duplicate_rank > 1
);

create unique index if not exists collaborations_application_id_active_unique
on public.collaborations(application_id)
where application_id is not null
  and status <> 'cancelled';

create unique index if not exists collaborations_campaign_creator_active_unique
on public.collaborations(campaign_id, creator_id)
where status <> 'cancelled';

drop policy if exists "business owners select recommended applications" on public.campaign_applications;
drop policy if exists "business owners create collaborations from selected applications" on public.collaborations;

drop policy if exists "business owners read applicant profiles" on public.profiles;
create policy "business owners read applicant profiles" on public.profiles
for select using (
  public.current_user_has_role('business')
  and exists (
    select 1
    from public.creator_profiles
    join public.campaign_applications on campaign_applications.creator_id = creator_profiles.id
    join public.campaigns on campaigns.id = campaign_applications.campaign_id
    join public.business_profiles on business_profiles.id = campaigns.business_id
    where creator_profiles.user_id = profiles.id
      and business_profiles.user_id = auth.uid()
  )
);

drop policy if exists "business owners read applicant creator profiles" on public.creator_profiles;
create policy "business owners read applicant creator profiles" on public.creator_profiles
for select using (
  public.current_user_has_role('business')
  and exists (
    select 1
    from public.campaign_applications
    join public.campaigns on campaigns.id = campaign_applications.campaign_id
    join public.business_profiles on business_profiles.id = campaigns.business_id
    where campaign_applications.creator_id = creator_profiles.id
      and business_profiles.user_id = auth.uid()
  )
);

drop policy if exists "business owners read applicant channels" on public.creator_channels;
create policy "business owners read applicant channels" on public.creator_channels
for select using (
  public.current_user_has_role('business')
  and exists (
    select 1
    from public.campaign_applications
    join public.campaigns on campaigns.id = campaign_applications.campaign_id
    join public.business_profiles on business_profiles.id = campaigns.business_id
    where campaign_applications.creator_id = creator_channels.creator_id
      and business_profiles.user_id = auth.uid()
  )
);

drop policy if exists "business owners read applicant portfolios" on public.portfolios;
create policy "business owners read applicant portfolios" on public.portfolios
for select using (
  public.current_user_has_role('business')
  and exists (
    select 1
    from public.campaign_applications
    join public.campaigns on campaigns.id = campaign_applications.campaign_id
    join public.business_profiles on business_profiles.id = campaigns.business_id
    where campaign_applications.creator_id = portfolios.creator_id
      and business_profiles.user_id = auth.uid()
  )
);

create or replace function public.select_recommended_application(target_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_application record;
  current_selected_count integer;
  new_collaboration_id uuid;
begin
  if not public.current_user_has_role('business') then
    raise exception '가게 계정만 지원자를 선정할 수 있습니다.';
  end if;

  select
    campaign_applications.id as application_id,
    campaign_applications.campaign_id,
    campaign_applications.creator_id,
    campaign_applications.status as application_status,
    campaigns.status as campaign_status,
    campaigns.recruit_count,
    campaigns.submission_due,
    business_profiles.user_id as business_user_id
  into selected_application
  from public.campaign_applications
  join public.campaigns on campaigns.id = campaign_applications.campaign_id
  join public.business_profiles on business_profiles.id = campaigns.business_id
  where campaign_applications.id = target_application_id
  for update of campaign_applications, campaigns;

  if not found then
    raise exception '추천 지원서를 찾을 수 없습니다.';
  end if;

  if selected_application.business_user_id <> auth.uid() then
    raise exception '해당 캠페인의 가게 계정만 선정할 수 있습니다.';
  end if;

  if selected_application.application_status <> 'recommended' then
    raise exception '추천 상태의 지원서만 선정할 수 있습니다.';
  end if;

  if selected_application.campaign_status <> 'selecting' then
    raise exception '모집 종료 후 선정중 상태에서만 선정할 수 있습니다.';
  end if;

  select count(*)
  into current_selected_count
  from public.collaborations
  where campaign_id = selected_application.campaign_id;

  if current_selected_count >= selected_application.recruit_count then
    raise exception '모집 정원이 마감되었습니다.';
  end if;

  if exists (
    select 1
    from public.collaborations
    where application_id = selected_application.application_id
      or (
        campaign_id = selected_application.campaign_id
        and creator_id = selected_application.creator_id
      )
  ) then
    raise exception '이미 생성된 협업입니다.';
  end if;

  insert into public.collaborations (
    campaign_id,
    creator_id,
    application_id,
    submission_due,
    status
  ) values (
    selected_application.campaign_id,
    selected_application.creator_id,
    selected_application.application_id,
    selected_application.submission_due,
    'selected'
  )
  returning id into new_collaboration_id;

  update public.campaign_applications
  set status = 'selected'
  where id = selected_application.application_id;

  if current_selected_count + 1 >= selected_application.recruit_count then
    update public.campaigns
    set
      status = 'in_progress',
      updated_at = now()
    where id = selected_application.campaign_id;
  end if;

  return new_collaboration_id;
end;
$$;

grant execute on function public.select_recommended_application(uuid) to authenticated;
