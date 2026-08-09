-- Product images storage bucket + access policies.
-- Images live under `{user_id}/{uuid}.webp`; public read via the public URL.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Public read: needed for product thumbnails shown to all visitors.
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Authenticated sellers upload their own images.
create policy "product_images_auth_insert"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "product_images_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "product_images_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );