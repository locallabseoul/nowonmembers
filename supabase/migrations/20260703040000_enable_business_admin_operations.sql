create policy "admins manage local stories" on public.local_stories
for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage reports" on public.reports
for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage reviews" on public.reviews
for all using (public.is_admin()) with check (public.is_admin());

create policy "users read own notifications" on public.notifications
for select using (user_id = auth.uid() or public.is_admin());

create policy "admins manage notifications" on public.notifications
for all using (public.is_admin()) with check (public.is_admin());
