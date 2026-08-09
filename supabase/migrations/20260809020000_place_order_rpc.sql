-- Atomic checkout. Called from a server action with the buyer's JWT.
-- security definer + search_path locked so it runs as the schema owner,
-- bypassing row-level policies that would block stock/ewallet writes.

create or replace function public.place_order(
  p_buyer_id uuid,
  p_address_street text,
  p_address_city text,
  p_address_country text,
  p_address_country_code text,
  p_address_lat double precision,
  p_address_lng double precision,
  p_orders jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ewallet_balance bigint;
  v_total bigint := 0;
  v_address_id uuid;
  v_order_id uuid;
  v_seller jsonb;
  v_item jsonb;
  v_line_total bigint;
  v_order_number text;
  v_product_id uuid;
  v_qty int;
  v_sku_qty int;
begin
  -- 1) Compute grand total and validate stock up-front.
  for v_seller in select * from jsonb_array_elements(p_orders)
  loop
    for v_item in select * from jsonb_array_elements(v_seller->'items')
    loop
      v_line_total := (v_item->>'quantity')::int * (v_item->>'product_price_cents')::bigint;
      v_total := v_total + v_line_total;
      if (select stock from public.products where id = (v_item->>'product_id')::uuid) < (v_item->>'quantity')::int then
        return jsonb_build_object('ok', false, 'error', 'One or more items are out of stock.');
      end if;
    end loop;
    v_total := v_total + (v_seller->>'shipping_cost_cents')::bigint;
  end loop;

  -- 2) Ewallet balance check.
  select balance_cents into v_ewallet_balance
    from public.ewallets where user_id = p_buyer_id;
  if v_ewallet_balance is null or v_ewallet_balance < v_total then
    return jsonb_build_object('ok', false, 'error', 'Insufficient ewallet balance.');
  end if;

  -- 3) Persist address.
  insert into public.addresses (user_id, street, city, country, country_code, lat, lng, is_default)
    values (p_buyer_id, p_address_street, p_address_city, p_address_country, p_address_country_code, p_address_lat, p_address_lng, true)
    returning id into v_address_id;

  -- 4) Deduct from balance.
  update public.ewallets set balance_cents = balance_cents - v_total where user_id = p_buyer_id;

  -- 5) Create one order per seller.
  for v_seller in select * from jsonb_array_elements(p_orders)
  loop
    v_order_id := gen_random_uuid();
    v_order_number := 'GM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(v_order_id::text), 1, 6));

    insert into public.orders (
      id, order_number, buyer_id, seller_id, seller_store_name, shipping_address_id,
      courier, shipping_cost_cents, discount_cents, subtotal_cents, total_cents,
      status, paid_at
    ) values (
      v_order_id,
      v_order_number,
      p_buyer_id,
      (v_seller->>'seller_id')::uuid,
      coalesce(v_seller->>'seller_store_name', ''),
      v_address_id,
      coalesce(v_seller->>'courier', 'JNE'),
      (v_seller->>'shipping_cost_cents')::bigint,
      0,
      (v_seller->>'subtotal_cents')::bigint,
      (v_seller->>'total_cents')::bigint,
      'paid',
      now()
    );

    for v_item in select * from jsonb_array_elements(v_seller->'items')
    loop
      v_qty := (v_item->>'quantity')::int;
      insert into public.order_items (
        order_id, product_id, product_name, product_price_cents, product_image_url, quantity
      ) values (
        v_order_id,
        (v_item->>'product_id')::uuid,
        v_item->>'product_name',
        (v_item->>'product_price_cents')::bigint,
        v_item->>'product_image_url',
        v_qty
      );
      update public.products set stock = stock - v_qty
        where id = (v_item->>'product_id')::uuid;
    end loop;

    insert into public.payments (order_id, method, status, amount_cents, provider_ref, paid_at)
    values (v_order_id, 'ewallet', 'completed', (v_seller->>'total_cents')::bigint, 'sim-' || v_order_id, now());

    insert into public.shipments (order_id, tracking_number, courier, received_at)
    values (v_order_id, 'TRK-' || upper(substr(md5(random()::text), 1, 10)), coalesce(v_seller->>'courier', 'JNE'), now());

    insert into public.notifications (user_id, type, title, body)
    values (
      (v_seller->>'seller_id')::uuid, 'order',
      'New order', 'You received a new order. Prepare it within 3 minutes.'
    );
  end loop;

  -- 6) Clear the buyer's cart.
  delete from public.cart_items where cart_id in (select id from public.carts where user_id = p_buyer_id);

  return jsonb_build_object('ok', true, 'total_cents', v_total);
end;
$$;