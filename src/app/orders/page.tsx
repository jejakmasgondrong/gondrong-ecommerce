import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };

const TIMELINE_MIN: Record<string, number> = {
  packing: 1,
  shipped: 3,
  delivered: 5,
};

export function deriveOrderStatus(
  paidAt: string,
  now: number,
  thresholds: Record<string, number> = TIMELINE_MIN,
  shipment?: { packed_at: string | null; shipped_at: string | null; delivered_at: string | null } | null
): string {
  if (shipment?.delivered_at) return "delivered";
  if (shipment?.shipped_at) return "shipped";
  if (shipment?.packed_at) return "processing";
  const elapsedMin = (now - new Date(paidAt).getTime()) / 60000;
  if (elapsedMin >= thresholds.delivered) return "delivered";
  if (elapsedMin >= thresholds.shipped) return "shipped";
  if (elapsedMin >= thresholds.packing) return "processing";
  return "paid";
}

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, seller_store_name, courier, subtotal_cents, shipping_cost_cents, total_cents, status, paid_at, created_at, order_items(id, product_name, product_image_url, quantity, product_price_cents), shipments(tracking_number, courier, received_at, packed_at, shipped_at, delivered_at)"
    )
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  const list = (orders ?? []).filter((o) => o.status !== "cancelled");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">My Orders</h1>

      {list.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">You have no orders yet.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {list.map((o) => {
            const shipment = o.shipments?.[0];
            const shown =
              o.status === "paid" || o.status === "processing"
                ? deriveOrderStatus(
                    o.paid_at ?? o.created_at,
                    // eslint-disable-next-line react-hooks/purity -- server component, per-request time is intended
                    Date.now(),
                    TIMELINE_MIN,
                    shipment
                  )
                : o.status;
            const steps = [
              { label: "Received", done: true },
              { label: "Processing", done: ["processing", "shipped", "delivered"].includes(shown) },
              { label: "Shipped", done: ["shipped", "delivered"].includes(shown) },
              { label: "Delivered", done: shown === "delivered" },
            ];
            return (
              <div key={o.id} className="rounded-xl border p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{o.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {o.seller_store_name || "Seller"} · {o.courier}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
                    {shown}
                  </span>
                </div>

                <ul className="space-y-2">
                  {o.order_items?.map((it) => (
                    <li key={it.id} className="flex items-center gap-3 text-sm">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                        {it.product_image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={it.product_image_url}
                            alt={it.product_name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <span className="flex-1 line-clamp-1">
                        {it.product_name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatIDR((it as unknown as { product_price_cents: number }).product_price_cents)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">
                    {shipment?.tracking_number ? `Tracking: ${shipment.tracking_number}` : "Tracking"}
                  </span>
                  <span className="font-semibold">
                    {formatIDR(o.total_cents)}
                  </span>
                </div>

                {/* Status timeline */}
                <div className="mt-4 flex items-center gap-2">
                  {steps.map((s, i) => (
                    <div key={s.label} className="flex flex-1 items-center gap-2 last:flex-none">
                      <div
                        className={
                          s.done
                            ? "h-6 w-6 rounded-full bg-primary text-center text-xs leading-6 text-primary-foreground"
                            : "h-6 w-6 rounded-full bg-muted text-center text-xs leading-6 text-muted-foreground"
                        }
                      >
                        {s.done ? "✓" : i + 1}
                      </div>
                      {i < steps.length - 1 && (
                        <div
                          className={
                            steps[i + 1].done
                              ? "h-0.5 flex-1 bg-primary"
                              : "h-0.5 flex-1 bg-border"
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  {steps.map((s) => (
                    <span key={s.label} className="flex-1">
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}