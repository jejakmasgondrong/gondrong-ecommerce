-- One review per (user, product). Allow the author to update their own
-- review instead of duplicating rows.

create unique index if not exists reviews_user_product_uidx
  on public.reviews (user_id, product_id);

create policy "reviews_update_own" on public.reviews
  for update using (auth.uid() = user_id);