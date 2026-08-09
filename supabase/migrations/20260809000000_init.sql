-- =========================================================
-- Gondrong E-commerce — Database Schema
-- Run this in Supabase SQL Editor (or via supabase db push)
-- =========================================================

-- Extensions
create extension if not exists "postgis";

-- Helper: updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------
-- profiles (extends auth.users)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create profile after signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'role', 'buyer')
  );

  -- give every new user an ewallet with Rp 10.000.000
  insert into public.ewallets (user_id, balance_cents)
  values (new.id, 1000000000);

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- =========================================================
-- ewallets
-- =========================================================
create table if not exists public.ewallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  balance_cents bigint not null default 1000000000, -- Rp 10.000.000
  last_refresh_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.ewallets enable row level security;

create policy "ewallets_select_own" on public.ewallets
  for select using (auth.uid() = user_id);

-- top-up balance to full once per day
create or replace function public.refresh_daily_balance()
returns trigger as $$
begin
  if new.last_refresh_date < current_date then
    new.last_refresh_date = current_date;
    if new.balance_cents < 1000000000 then
      new.balance_cents = 1000000000;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger ewallets_refresh_daily
  before update on public.ewallets
  for each row execute function public.refresh_daily_balance();

-- =========================================================
-- addresses (geocoded)
-- =========================================================
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  street text not null,
  city text not null,
  country text not null,
  country_code text not null,
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

create policy "addresses_select_own" on public.addresses
  for select using (auth.uid() = user_id);

create policy "addresses_insert_own" on public.addresses
  for insert with check (auth.uid() = user_id);

create policy "addresses_update_own" on public.addresses
  for update using (auth.uid() = user_id);

create policy "addresses_delete_own" on public.addresses
  for delete using (auth.uid() = user_id);

-- =========================================================
-- seller_profiles
-- =========================================================
create table if not exists public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_name text not null,
  description text,
  origin_address_id uuid references public.addresses(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.seller_profiles enable row level security;

create policy "seller_profiles_select_own" on public.seller_profiles
  for select using (auth.uid() = user_id);

create policy "seller_select_public" on public.seller_profiles
  for select using (status = 'active');

create policy "seller_profiles_insert_own" on public.seller_profiles
  for insert with check (auth.uid() = user_id);

-- =========================================================
-- categories
-- =========================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
create policy "categories_select_all" on public.categories
  for select using (true);

-- =========================================================
-- products
-- =========================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text not null default '',
  price_cents bigint not null check (price_cents > 0),
  stock int not null default 0,
  image_urls text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

create policy "products_select_all" on public.products
  for select using (status = 'active');

create policy "products_select_all_staff" on public.products
  for select using (status in ('active', 'inactive'));

create policy "products_insert_owner" on public.products
  for insert with check (
    auth.uid() = seller_id
    and (select status from public.seller_profiles where user_id = auth.uid()) = 'active'
  );

create policy "products_update_owner" on public.products
  for update using (
    auth.uid() = seller_id
    and (select status from public.seller_profiles where user_id = auth.uid()) = 'active'
  );

create policy "products_delete_owner" on public.products
  for delete using (
    auth.uid() = seller_id
    and (select status from public.seller_profiles where user_id = auth.uid()) = 'active'
  );

create policy "products_admin_all" on public.products
  for all using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- =========================================================
-- carts / cart_items
-- =========================================================
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.carts enable row level security;
create policy "carts_select_own" on public.carts
  for select using (auth.uid() = user_id);
create policy "carts_insert_own" on public.carts
  for insert with check (auth.uid() = user_id);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

alter table public.cart_items enable row level security;

create policy "cart_items_select_own" on public.cart_items
  for select using (
    exists (select 1 from public.carts where carts.id = cart_id and carts.user_id = auth.uid())
  );

create policy "cart_items_insert_own" on public.cart_items
  for insert with check (
    exists (select 1 from public.carts where carts.id = cart_id and carts.user_id = auth.uid())
  );

create policy "cart_items_update_own" on public.cart_items
  for update using (
    exists (select 1 from public.carts where carts.id = cart_id and carts.user_id = auth.uid())
  );

create policy "cart_items_delete_own" on public.cart_items
  for delete using (
    exists (select 1 from public.carts where carts.id = cart_id and carts.user_id = auth.uid())
  );

-- =========================================================
-- orders / order_items
-- =========================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  seller_store_name text not null default '',
  shipping_address_id uuid references public.addresses(id) on delete set null,
  courier text not null,
  shipping_cost_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  subtotal_cents bigint not null default 0,
  total_cents bigint not null default 0,
  status text not null default 'waiting_payment'
    check (status in ('waiting_payment', 'paid', 'processing', 'packed', 'shipped', 'delivered', 'cancelled')),
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "orders_select_participants" on public.orders
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "orders_insert_buyer" on public.orders
  for insert with check (auth.uid() = buyer_id);

create policy "orders_update_seller" on public.orders
  for update using (auth.uid() = seller_id);

create policy "orders_update_buyer" on public.orders
  for update using (auth.uid() = buyer_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  product_name text not null,
  product_price_cents bigint not null,
  product_image_url text,
  quantity int not null check (quantity > 0)
);

alter table public.order_items enable row level security;

create policy "order_items_select_participants" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid()))
  );

-- =========================================================
-- payments
-- =========================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null check (method in ('qris', 'va', 'card', 'ewallet')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  amount_cents bigint not null,
  provider_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "payments_select_participants" on public.payments
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

create policy "payments_insert_buyer" on public.payments
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
  );

create policy "admin_payments_all" on public.payments
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- =========================================================
-- shipments
-- =========================================================
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  tracking_number text not null,
  courier text not null,
  received_at timestamptz default null,   -- t=0
  packed_at timestamptz default null,     -- t=1
  shipped_at timestamptz default null,    -- t=3
  delivered_at timestamptz default null,  -- t=5
  created_at timestamptz not null default now()
);

alter table public.shipments enable row level security;

create policy "shipments_select_participants" on public.shipments
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- =========================================================
-- notifications
-- =========================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  body text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- =========================================================
-- reviews (P6)
-- =========================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;
create policy "reviews_select_all" on public.reviews
  for select using (true);
create policy "reviews_insert_own" on public.reviews
  for insert with check (auth.uid() = user_id);

-- =========================================================
-- admin access
-- =========================================================
create or replace view public.admin_seller_profiles as
  select * from public.seller_profiles;