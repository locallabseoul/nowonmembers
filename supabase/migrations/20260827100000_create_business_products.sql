create table public.business_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  short_description text not null check (char_length(short_description) between 1 and 200),
  price integer not null check (price between 0 and 1000000000),
  image_url text not null,
  image_path text not null,
  link_url text not null check (link_url ~ '^https?://'),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_products_public_idx
on public.business_products (business_id, is_visible, created_at desc);

alter table public.business_products enable row level security;

create policy "public reads visible business products" on public.business_products
for select to public using (
  is_visible
  and exists (
    select 1
    from public.business_profiles business
    where business.id = business_products.business_id
      and business.is_public
      and business.verification_status = 'verified'
  )
);

create policy "business owners manage own products" on public.business_products
for all to authenticated
using (
  exists (
    select 1 from public.business_profiles business
    where business.id = business_products.business_id
      and business.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.business_profiles business
    where business.id = business_products.business_id
      and business.user_id = auth.uid()
  )
);

create policy "admins manage business products" on public.business_products
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads product images" on storage.objects
for select to public using (bucket_id = 'product-images');

create policy "business users upload product images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.current_user_has_role('business'::public.user_role)
);

create policy "business users update own product images" on storage.objects
for update to authenticated
using (bucket_id = 'product-images' and owner = auth.uid())
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "business users delete own product images" on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and owner = auth.uid());
