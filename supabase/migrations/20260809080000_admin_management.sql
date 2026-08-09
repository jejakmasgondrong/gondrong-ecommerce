-- Admin management: read/update all profiles (role changes), admin CRUD on categories.

-- profiles: admin can read every profile (for user management) + change roles.
create policy "admin_profiles_select" on public.profiles
  for select using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "admin_profiles_update" on public.profiles
  for update using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- categories: admin can create, update, delete.
create policy "admin_categories_insert" on public.categories
  for insert with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "admin_categories_update" on public.categories
  for update using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "admin_categories_delete" on public.categories
  for delete using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );