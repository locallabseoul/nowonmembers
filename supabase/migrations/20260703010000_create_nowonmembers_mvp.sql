create type public.user_role as enum ('business', 'creator', 'resident', 'admin');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.campaign_status as enum ('draft', 'in_review', 'revision_requested', 'approved', 'scheduled', 'recruiting', 'selecting', 'in_progress', 'submission_review', 'completed', 'cancelled', 'failed');
create type public.application_status as enum ('submitted', 'recommended', 'selected', 'rejected', 'cancelled');
create type public.collaboration_status as enum ('selected', 'visit_scheduled', 'visited', 'submitted', 'revision_requested', 'approved', 'completed', 'no_show', 'cancelled');
create type public.submission_status as enum ('submitted', 'needs_revision', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'creator',
  name text,
  nickname text,
  email text,
  phone text,
  verification_status public.verification_status not null default 'pending',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  category text not null,
  description text,
  short_intro text,
  address text,
  district text,
  latitude numeric,
  longitude numeric,
  contact text,
  business_hours jsonb not null default '{}'::jsonb,
  website_url text,
  social_urls text[] not null default '{}',
  cover_image_url text,
  verification_status public.verification_status not null default 'pending',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_areas text[] not null default '{}',
  interests text[] not null default '{}',
  content_types text[] not null default '{}',
  bio text,
  avatar_url text,
  available_days text[] not null default '{}',
  verification_status public.verification_status not null default 'pending',
  completion_rate numeric not null default 0,
  deadline_rate numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.creator_channels (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  platform text not null,
  channel_name text,
  channel_url text not null,
  follower_count integer,
  average_views integer,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  title text not null,
  content_type text not null,
  thumbnail_url text,
  url text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  title text not null,
  description text,
  campaign_type text not null,
  region text not null,
  category text,
  recruit_count integer not null default 1,
  recruit_start date,
  recruit_end date,
  selection_date date,
  visit_start date,
  visit_end date,
  submission_due date,
  benefit_type text,
  benefit_value text,
  fee numeric,
  content_requirements jsonb not null default '[]'::jsonb,
  usage_rights text,
  status public.campaign_status not null default 'draft',
  cover_image_url text,
  beginner_friendly boolean not null default false,
  operator_recommended boolean not null default false,
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  message text,
  available_dates text,
  proposed_content_type text,
  portfolio_refs uuid[] not null default '{}',
  status public.application_status not null default 'submitted',
  admin_memo text,
  applied_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

create table public.collaborations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  application_id uuid references public.campaign_applications(id) on delete set null,
  selected_at timestamptz not null default now(),
  visit_date date,
  submission_due date,
  status public.collaboration_status not null default 'selected',
  cancellation_reason text,
  created_at timestamptz not null default now()
);

create table public.content_submissions (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  platform text not null,
  content_url text not null,
  published_at date,
  preview_image_url text,
  disclosure_confirmed boolean not null default false,
  raw_file_url text,
  review_status public.submission_status not null default 'submitted',
  admin_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.local_stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  body text,
  cover_image_url text,
  business_id uuid references public.business_profiles(id) on delete set null,
  creator_id uuid references public.creator_profiles(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  category text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  punctuality integer check (punctuality between 1 and 5),
  communication integer check (communication between 1 and 5),
  guideline_compliance integer check (guideline_compliance between 1 and 5),
  rework_intent boolean,
  private_comment text,
  created_at timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  target_type text not null,
  rule_type text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.business_profiles enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.creator_channels enable row level security;
alter table public.portfolios enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_applications enable row level security;
alter table public.collaborations enable row level security;
alter table public.content_submissions enable row level security;
alter table public.local_stories enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.reviews enable row level security;
alter table public.badges enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create policy "public can read recruiting campaigns" on public.campaigns
for select using (status in ('recruiting', 'selecting', 'completed') or public.is_admin());

create policy "public can read published stories" on public.local_stories
for select using (published_at is not null or public.is_admin());

create policy "users read own profile" on public.profiles
for select using (id = auth.uid() or public.is_admin());

create policy "users update own profile" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "business owners manage own profile" on public.business_profiles
for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "creator owners manage own profile" on public.creator_profiles
for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "admins manage all applications" on public.campaign_applications
for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage all collaborations" on public.collaborations
for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage submissions" on public.content_submissions
for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage badges" on public.badges
for all using (public.is_admin()) with check (public.is_admin());
