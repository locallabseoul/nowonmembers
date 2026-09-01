-- 배포 전 구버전 코드가 submission_id 없이 만든 중복부터 제거한다.
with matched_stories as (
  select
    story.id,
    submission.id as submission_id,
    row_number() over (
      partition by submission.id
      order by story.created_at asc, story.id asc
    ) as match_rank
  from public.local_stories as story
  join public.collaborations as collaboration
    on collaboration.campaign_id = story.campaign_id
   and collaboration.creator_id = story.creator_id
  join public.content_submissions as submission
    on submission.collaboration_id = collaboration.id
   and position(submission.content_url in coalesce(story.body, '')) > 0
  where story.submission_id is null
)
delete from public.local_stories as story
using matched_stories
where story.id = matched_stories.id
  and (
    matched_stories.match_rank > 1
    or exists (
      select 1
      from public.local_stories as linked_story
      where linked_story.submission_id = matched_stories.submission_id
    )
  );

-- 중복이 아닌 구버전 스토리는 원본 제출물과 연결한다.
update public.local_stories as story
set submission_id = submission.id
from public.content_submissions as submission
join public.collaborations as collaboration
  on collaboration.id = submission.collaboration_id
where story.submission_id is null
  and story.campaign_id = collaboration.campaign_id
  and story.creator_id = collaboration.creator_id
  and position(submission.content_url in coalesce(story.body, '')) > 0;

with ranked_stories as (
  select
    id,
    row_number() over (
      partition by submission_id
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.local_stories
  where submission_id is not null
)
delete from public.local_stories as story
using ranked_stories
where story.id = ranked_stories.id
  and ranked_stories.duplicate_rank > 1;

-- 구버전 발행 요청에도 원본 제출물을 자동 연결해 유일성 제약이 중복을 차단하게 한다.
create or replace function public.link_local_story_submission()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.submission_id is null then
    select submission.id
    into new.submission_id
    from public.content_submissions as submission
    join public.collaborations as collaboration
      on collaboration.id = submission.collaboration_id
    where collaboration.campaign_id = new.campaign_id
      and collaboration.creator_id = new.creator_id
      and position(submission.content_url in coalesce(new.body, '')) > 0
    order by submission.created_at desc
    limit 1;
  end if;

  return new;
end;
$$;

create trigger link_local_story_submission_before_write
before insert or update of submission_id, campaign_id, creator_id, body
on public.local_stories
for each row
execute function public.link_local_story_submission();
