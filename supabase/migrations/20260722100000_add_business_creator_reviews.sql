alter table public.reviews
add column if not exists content_quality integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_content_quality_check'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
    add constraint reviews_content_quality_check
    check (content_quality between 1 and 5);
  end if;
end;
$$;

alter table public.reviews
add column if not exists tags text[] not null default '{}'::text[];

alter table public.reviews
add column if not exists updated_at timestamptz not null default now();

update public.reviews
set updated_at = coalesce(updated_at, created_at, now());

with ranked_reviews as (
  select
    id,
    row_number() over (
      partition by collaboration_id, reviewer_id
      order by updated_at desc, created_at desc, id desc
    ) as review_rank
  from public.reviews
)
delete from public.reviews
using ranked_reviews
where reviews.id = ranked_reviews.id
  and ranked_reviews.review_rank > 1;

create unique index if not exists reviews_collaboration_reviewer_idx
on public.reviews (collaboration_id, reviewer_id);

drop policy if exists "business owners read own collaboration reviews" on public.reviews;
create policy "business owners read own collaboration reviews" on public.reviews
for select using (
  public.current_user_has_role('business'::public.user_role)
  and reviewer_id = auth.uid()
  and exists (
    select 1
    from public.collaborations
    join public.campaigns on campaigns.id = collaborations.campaign_id
    join public.business_profiles on business_profiles.id = campaigns.business_id
    join public.creator_profiles on creator_profiles.id = collaborations.creator_id
    where collaborations.id = reviews.collaboration_id
      and business_profiles.user_id = auth.uid()
      and creator_profiles.user_id = reviews.reviewee_id
  )
);

drop policy if exists "business owners insert own collaboration reviews" on public.reviews;
create policy "business owners insert own collaboration reviews" on public.reviews
for insert with check (
  public.current_user_has_role('business'::public.user_role)
  and reviewer_id = auth.uid()
  and exists (
    select 1
    from public.collaborations
    join public.campaigns on campaigns.id = collaborations.campaign_id
    join public.business_profiles on business_profiles.id = campaigns.business_id
    join public.creator_profiles on creator_profiles.id = collaborations.creator_id
    where collaborations.id = reviews.collaboration_id
      and business_profiles.user_id = auth.uid()
      and creator_profiles.user_id = reviews.reviewee_id
  )
);

drop policy if exists "business owners update own collaboration reviews" on public.reviews;
create policy "business owners update own collaboration reviews" on public.reviews
for update using (
  public.current_user_has_role('business'::public.user_role)
  and reviewer_id = auth.uid()
  and exists (
    select 1
    from public.collaborations
    join public.campaigns on campaigns.id = collaborations.campaign_id
    join public.business_profiles on business_profiles.id = campaigns.business_id
    join public.creator_profiles on creator_profiles.id = collaborations.creator_id
    where collaborations.id = reviews.collaboration_id
      and business_profiles.user_id = auth.uid()
      and creator_profiles.user_id = reviews.reviewee_id
  )
) with check (
  public.current_user_has_role('business'::public.user_role)
  and reviewer_id = auth.uid()
  and exists (
    select 1
    from public.collaborations
    join public.campaigns on campaigns.id = collaborations.campaign_id
    join public.business_profiles on business_profiles.id = campaigns.business_id
    join public.creator_profiles on creator_profiles.id = collaborations.creator_id
    where collaborations.id = reviews.collaboration_id
      and business_profiles.user_id = auth.uid()
      and creator_profiles.user_id = reviews.reviewee_id
  )
);
