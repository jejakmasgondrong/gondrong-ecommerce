-- Let the receiving seller update the shipment for their own order
-- (mark packed / shipped). Buyer reads stay on the existing
-- shipments_select_participants policy.

create policy "shipments_update_seller" on public.shipments
  for update using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.seller_id = auth.uid()
    )
  );