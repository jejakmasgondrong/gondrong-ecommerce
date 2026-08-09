-- Admin policies: read + update every seller profile (approve/reject/activate).

create policy "admin_seller_profiles_select" on public.seller_profiles
  for select using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "admin_seller_profiles_update" on public.seller_profiles
  for update using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );