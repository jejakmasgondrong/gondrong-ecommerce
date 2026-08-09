-- Seller origin coordinates (denormalized so buyers can read them under RLS
-- without accessing the owner's addresses table) + missing self-service policies.

alter table public.seller_profiles
  add column if not exists origin_lat double precision,
  add column if not exists origin_lng double precision;

-- Seed data: the admin/gondong store is geolocated at Tugu Yogyakarta.
update public.seller_profiles
  set origin_lat = -7.7828, origin_lng = 110.367
  where store_name = 'Gondong Official Store' and origin_lat is null;

-- Buyers need to update their own ewallet during checkout.
create policy "ewallets_update_own" on public.ewallets
  for update using (auth.uid() = user_id);