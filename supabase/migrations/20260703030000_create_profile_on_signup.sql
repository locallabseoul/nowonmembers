create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'creator'),
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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
