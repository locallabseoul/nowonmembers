alter table public.local_stories
add column submission_id uuid references public.content_submissions(id) on delete set null;

-- 기존 스토리는 저장된 캠페인/크리에이터/콘텐츠 URL을 이용해 원본 제출물과 연결한다.
update public.local_stories as story
set submission_id = submission.id
from public.content_submissions as submission
join public.collaborations as collaboration
  on collaboration.id = submission.collaboration_id
where story.submission_id is null
  and story.campaign_id = collaboration.campaign_id
  and story.creator_id = collaboration.creator_id
  and position(submission.content_url in coalesce(story.body, '')) > 0;

-- 같은 제출물로 여러 번 발행된 기존 데이터는 최초 생성된 게시물 한 건만 유지한다.
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

alter table public.local_stories
add constraint local_stories_submission_id_key unique (submission_id);
