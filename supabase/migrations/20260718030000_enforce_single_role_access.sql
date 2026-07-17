create or replace function public.current_user_has_role(required_role public.user_role)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = required_role
      and status = 'active'
  );
$$;

create or replace function public.prevent_profile_privilege_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'profiles.role cannot be changed by the account owner';
    end if;

    if new.status is distinct from old.status then
      raise exception 'profiles.status cannot be changed by the account owner';
    end if;

    if new.verification_status is distinct from old.verification_status then
      raise exception 'profiles.verification_status cannot be changed by the account owner';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privilege_changes on public.profiles;

create trigger protect_profile_privilege_changes
before update on public.profiles
for each row execute function public.prevent_profile_privilege_changes();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signup_role public.user_role;
begin
  signup_role := case
    when new.raw_user_meta_data ->> 'role' = 'business' then 'business'::public.user_role
    else 'creator'::public.user_role
  end;

  insert into public.profiles (
    id,
    email,
    role,
    nickname,
    verification_status,
    status
  )
  values (
    new.id,
    new.email,
    signup_role,
    new.raw_user_meta_data ->> 'nickname',
    'pending',
    'active'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    role = excluded.role,
    nickname = excluded.nickname,
    updated_at = now();

  return new;
end;
$$;

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles
for insert with check (
  id = auth.uid()
  and role in ('business', 'creator')
  and verification_status = 'pending'
  and status = 'active'
);

drop policy if exists "business owners manage own profile" on public.business_profiles;
create policy "business owners manage own profile" on public.business_profiles
for all using (
  public.is_admin()
  or (
    user_id = auth.uid()
    and public.current_user_has_role('business')
  )
) with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and public.current_user_has_role('business')
  )
);

drop policy if exists "creator owners manage own profile" on public.creator_profiles;
create policy "creator owners manage own profile" on public.creator_profiles
for all using (
  public.is_admin()
  or (
    user_id = auth.uid()
    and public.current_user_has_role('creator')
  )
) with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and public.current_user_has_role('creator')
  )
);

drop policy if exists "creator owners manage channels" on public.creator_channels;
create policy "creator owners manage channels" on public.creator_channels
for all using (
  public.is_admin()
  or (
    public.current_user_has_role('creator')
    and exists (
      select 1
      from public.creator_profiles
      where creator_profiles.id = creator_channels.creator_id
        and creator_profiles.user_id = auth.uid()
    )
  )
) with check (
  public.is_admin()
  or (
    public.current_user_has_role('creator')
    and exists (
      select 1
      from public.creator_profiles
      where creator_profiles.id = creator_channels.creator_id
        and creator_profiles.user_id = auth.uid()
    )
  )
);

drop policy if exists "creator owners manage portfolios" on public.portfolios;
create policy "creator owners manage portfolios" on public.portfolios
for all using (
  public.is_admin()
  or (
    public.current_user_has_role('creator')
    and exists (
      select 1
      from public.creator_profiles
      where creator_profiles.id = portfolios.creator_id
        and creator_profiles.user_id = auth.uid()
    )
  )
) with check (
  public.is_admin()
  or (
    public.current_user_has_role('creator')
    and exists (
      select 1
      from public.creator_profiles
      where creator_profiles.id = portfolios.creator_id
        and creator_profiles.user_id = auth.uid()
    )
  )
);

drop policy if exists "business owners manage campaigns" on public.campaigns;
create policy "business owners manage campaigns" on public.campaigns
for all using (
  public.is_admin()
  or (
    public.current_user_has_role('business')
    and exists (
      select 1
      from public.business_profiles
      where business_profiles.id = campaigns.business_id
        and business_profiles.user_id = auth.uid()
    )
  )
) with check (
  public.is_admin()
  or (
    public.current_user_has_role('business')
    and exists (
      select 1
      from public.business_profiles
      where business_profiles.id = campaigns.business_id
        and business_profiles.user_id = auth.uid()
    )
  )
);

drop policy if exists "creators insert own applications" on public.campaign_applications;
create policy "creators insert own applications" on public.campaign_applications
for insert with check (
  public.current_user_has_role('creator')
  and exists (
    select 1
    from public.creator_profiles
    where creator_profiles.id = campaign_applications.creator_id
      and creator_profiles.user_id = auth.uid()
  )
);

drop policy if exists "creators read own applications" on public.campaign_applications;
create policy "creators read own applications" on public.campaign_applications
for select using (
  public.is_admin()
  or (
    public.current_user_has_role('creator')
    and exists (
      select 1
      from public.creator_profiles
      where creator_profiles.id = campaign_applications.creator_id
        and creator_profiles.user_id = auth.uid()
    )
  )
  or (
    public.current_user_has_role('business')
    and exists (
      select 1
      from public.campaigns
      join public.business_profiles on business_profiles.id = campaigns.business_id
      where campaigns.id = campaign_applications.campaign_id
        and business_profiles.user_id = auth.uid()
    )
  )
);

drop policy if exists "business owners select recommended applications" on public.campaign_applications;
create policy "business owners select recommended applications" on public.campaign_applications
for update using (
  public.current_user_has_role('business')
  and exists (
    select 1
    from public.campaigns
    join public.business_profiles on business_profiles.id = campaigns.business_id
    where campaigns.id = campaign_applications.campaign_id
      and business_profiles.user_id = auth.uid()
      and campaign_applications.status = 'recommended'
  )
) with check (
  public.current_user_has_role('business')
  and exists (
    select 1
    from public.campaigns
    join public.business_profiles on business_profiles.id = campaigns.business_id
    where campaigns.id = campaign_applications.campaign_id
      and business_profiles.user_id = auth.uid()
      and campaign_applications.status in ('selected', 'rejected')
  )
);

drop policy if exists "creators read own collaborations" on public.collaborations;
create policy "creators read own collaborations" on public.collaborations
for select using (
  public.is_admin()
  or (
    public.current_user_has_role('creator')
    and exists (
      select 1
      from public.creator_profiles
      where creator_profiles.id = collaborations.creator_id
        and creator_profiles.user_id = auth.uid()
    )
  )
  or (
    public.current_user_has_role('business')
    and exists (
      select 1
      from public.campaigns
      join public.business_profiles on business_profiles.id = campaigns.business_id
      where campaigns.id = collaborations.campaign_id
        and business_profiles.user_id = auth.uid()
    )
  )
);

drop policy if exists "business owners create collaborations from selected applications" on public.collaborations;
create policy "business owners create collaborations from selected applications" on public.collaborations
for insert with check (
  public.current_user_has_role('business')
  and exists (
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

drop policy if exists "creators manage own submissions" on public.content_submissions;
create policy "creators manage own submissions" on public.content_submissions
for all using (
  public.is_admin()
  or (
    public.current_user_has_role('creator')
    and exists (
      select 1
      from public.collaborations
      join public.creator_profiles on creator_profiles.id = collaborations.creator_id
      where collaborations.id = content_submissions.collaboration_id
        and creator_profiles.user_id = auth.uid()
    )
  )
) with check (
  public.is_admin()
  or (
    public.current_user_has_role('creator')
    and exists (
      select 1
      from public.collaborations
      join public.creator_profiles on creator_profiles.id = collaborations.creator_id
      where collaborations.id = content_submissions.collaboration_id
        and creator_profiles.user_id = auth.uid()
    )
  )
);

drop policy if exists "creators read submissions for own collaborations" on public.content_submissions;
create policy "creators read submissions for own collaborations" on public.content_submissions
for select using (
  public.is_admin()
  or (
    public.current_user_has_role('creator')
    and exists (
      select 1
      from public.collaborations
      join public.creator_profiles on creator_profiles.id = collaborations.creator_id
      where collaborations.id = content_submissions.collaboration_id
        and creator_profiles.user_id = auth.uid()
    )
  )
  or (
    public.current_user_has_role('business')
    and exists (
      select 1
      from public.collaborations
      join public.campaigns on campaigns.id = collaborations.campaign_id
      join public.business_profiles on business_profiles.id = campaigns.business_id
      where collaborations.id = content_submissions.collaboration_id
        and business_profiles.user_id = auth.uid()
    )
  )
);
