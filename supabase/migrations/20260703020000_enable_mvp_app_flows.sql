alter table public.business_profiles alter column user_id drop not null;
alter table public.creator_profiles alter column user_id drop not null;

alter table public.business_profiles
add constraint business_profiles_user_id_key unique (user_id);

alter table public.creator_profiles
add constraint creator_profiles_user_id_key unique (user_id);

create policy "users insert own profile" on public.profiles
for insert with check (id = auth.uid());

create policy "public can read public business profiles" on public.business_profiles
for select using (is_public = true or user_id = auth.uid() or public.is_admin());

create policy "public can read verified creator profiles" on public.creator_profiles
for select using (verification_status = 'verified' or user_id = auth.uid() or public.is_admin());

create policy "creator owners manage channels" on public.creator_channels
for all using (
  exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = creator_channels.creator_id
      and (creator_profiles.user_id = auth.uid() or public.is_admin())
  )
) with check (
  exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = creator_channels.creator_id
      and (creator_profiles.user_id = auth.uid() or public.is_admin())
  )
);

create policy "creator owners manage portfolios" on public.portfolios
for all using (
  exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = portfolios.creator_id
      and (creator_profiles.user_id = auth.uid() or public.is_admin())
  )
) with check (
  exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = portfolios.creator_id
      and (creator_profiles.user_id = auth.uid() or public.is_admin())
  )
);

create policy "business owners manage campaigns" on public.campaigns
for all using (
  exists (
    select 1 from public.business_profiles
    where business_profiles.id = campaigns.business_id
      and (business_profiles.user_id = auth.uid() or public.is_admin())
  )
) with check (
  exists (
    select 1 from public.business_profiles
    where business_profiles.id = campaigns.business_id
      and (business_profiles.user_id = auth.uid() or public.is_admin())
  )
);

create policy "creators insert own applications" on public.campaign_applications
for insert with check (
  exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = campaign_applications.creator_id
      and creator_profiles.user_id = auth.uid()
  )
);

create policy "creators read own applications" on public.campaign_applications
for select using (
  public.is_admin()
  or exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = campaign_applications.creator_id
      and creator_profiles.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.campaigns
    join public.business_profiles on business_profiles.id = campaigns.business_id
    where campaigns.id = campaign_applications.campaign_id
      and business_profiles.user_id = auth.uid()
  )
);

create policy "creators manage own submissions" on public.content_submissions
for all using (
  public.is_admin()
  or exists (
    select 1
    from public.collaborations
    join public.creator_profiles on creator_profiles.id = collaborations.creator_id
    where collaborations.id = content_submissions.collaboration_id
      and creator_profiles.user_id = auth.uid()
  )
) with check (
  public.is_admin()
  or exists (
    select 1
    from public.collaborations
    join public.creator_profiles on creator_profiles.id = collaborations.creator_id
    where collaborations.id = content_submissions.collaboration_id
      and creator_profiles.user_id = auth.uid()
  )
);

insert into public.business_profiles (
  id, business_name, category, description, short_intro, address, district, contact,
  business_hours, social_urls, cover_image_url, verification_status, is_public
) values
  (
    '11111111-1111-4111-8111-111111111111',
    '카페 오디너리',
    '카페·베이커리',
    '직접 굽는 디저트와 편안한 공간을 소개하고 싶은 동네 카페입니다.',
    '공릉동 골목의 계절 디저트와 스페셜티 커피',
    '서울 노원구 공릉로 101',
    '공릉동',
    '02-000-1010',
    '{"default":"매일 10:00-21:00"}'::jsonb,
    array['https://instagram.com/ordinary.nowon'],
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1400&q=80',
    'verified',
    true
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '스튜디오 포레스트',
    '공방·클래스',
    '지역 주민과 크리에이터가 함께 기록할 수 있는 식물 클래스를 운영합니다.',
    '초록 식물과 함께하는 원데이 클래스',
    '서울 노원구 동일로 1500',
    '상계동',
    '02-000-2020',
    '{"default":"화-일 11:00-19:00"}'::jsonb,
    array['https://instagram.com/studioforest'],
    'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1400&q=80',
    'verified',
    true
  )
on conflict (id) do nothing;

insert into public.creator_profiles (
  id, activity_areas, interests, content_types, bio, avatar_url, available_days,
  verification_status, completion_rate, deadline_rate
) values
  (
    '33333333-3333-4333-8333-333333333333',
    array['공릉동', '상계동', '중계동'],
    array['카페', '디저트', '동네 산책'],
    array['블로그', '인스타그램', '숏폼'],
    '노원 생활권 카페와 산책 코스를 기록하는 블로그·릴스 크리에이터입니다.',
    'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg',
    array['금', '토', '일'],
    'verified',
    96,
    92
  )
on conflict (id) do nothing;

insert into public.campaigns (
  id, business_id, title, description, campaign_type, region, category, recruit_count,
  recruit_start, recruit_end, selection_date, visit_start, visit_end, submission_due,
  benefit_type, benefit_value, fee, content_requirements, usage_rights, status,
  cover_image_url, beginner_friendly, operator_recommended
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '공릉동 시그니처 디저트와 커피 콘텐츠 협업',
    '직접 굽는 시그니처 디저트와 스페셜티 커피를 경험하고, 공간의 분위기와 메뉴 이야기를 콘텐츠로 기록할 크리에이터를 찾습니다.',
    'visit',
    '공릉동',
    '카페·베이커리',
    15,
    '2026-07-03',
    '2026-07-18',
    '2026-07-20',
    '2026-07-22',
    '2026-08-02',
    '2026-08-09',
    '체험 제공',
    '디저트 2종 + 음료 2잔',
    null,
    '["제공 사실 표시", "대표 메뉴 2개 이상 소개", "공간 사진 3장 이상", "예약 방문 일정 준수"]'::jsonb,
    '가게 SNS 리그램과 노원멤버스 로컬 스토리 소개에 활용',
    'recruiting',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1400&q=80',
    true,
    true
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    '식물 원데이 클래스 숏폼 제작 파트너 모집',
    '식물 클래스를 체험하고 클래스 과정과 완성 작품을 짧은 영상으로 담아낼 크리에이터를 모집합니다.',
    'shortform',
    '상계동',
    '공방·클래스',
    6,
    '2026-07-05',
    '2026-07-24',
    '2026-07-25',
    '2026-07-29',
    '2026-08-08',
    '2026-08-15',
    '체험 + 제작비',
    '클래스 1회 + 제작비 50,000원',
    50000,
    '["릴스 또는 쇼츠 1개", "과정 컷 3장 이상", "제공 사실 표시", "원본 파일 선택 제출"]'::jsonb,
    '가게 채널 게시 전 별도 동의 필요, 노원멤버스 아카이브 썸네일 사용 가능',
    'recruiting',
    'https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=1400&q=80',
    false,
    false
  )
on conflict (id) do nothing;

insert into public.local_stories (
  id, title, summary, body, cover_image_url, business_id, creator_id, campaign_id, category, published_at
) values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '공릉동 골목에서 만난 계절 디저트',
  '카페 오디너리와 지역 크리에이터가 함께 기록한 여름 디저트 이야기',
  '직접 구운 디저트와 작은 골목의 분위기를 중심으로 노원의 일상적인 장면을 기록했습니다.',
  'https://images.unsplash.com/photo-1464306076886-da185f6a9d05?auto=format&fit=crop&w=1400&q=80',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '오늘의 가게',
  now()
)
on conflict (id) do nothing;
