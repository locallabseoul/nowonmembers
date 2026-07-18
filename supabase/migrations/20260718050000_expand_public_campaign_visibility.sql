drop policy if exists "public can read recruiting campaigns" on public.campaigns;
drop policy if exists "public can read visible campaigns" on public.campaigns;

create policy "public can read visible campaigns" on public.campaigns
for select using (
  status in (
    'recruiting',
    'selecting',
    'in_progress',
    'submission_review',
    'completed',
    'cancelled',
    'failed'
  )
  or public.is_admin()
);
