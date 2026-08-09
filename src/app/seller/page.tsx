import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/format";
import ShipmentActions from "@/components/shipment-actions";

export const metadata: Metadata = { title: "Seller Dashboard" };

function deriveShipmentStatus(o: {
  status: string;
  shipments: { packed_at: string | null; shipped_at: string | null; delivered_at: string | null }[];
}): { label: string; step?: "packed" | "shipped" } {
  const s = o.shipments?.[0];
  if (s?.delivered_at) return { label: "delivered" };
  if (s?.shipped_at) return { label: "shipped" };
  if (s?.packed_at) return { label: "processing", step: "shipped" };
  if (o.status === "cancelled") return { label: "cancelled" };
  return { label: "paid", step: "packed" };
}

export default async function SellerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await searchParams;
  const messages: Record<string, string> = {
    invalid: "Please provide a valid name, price and stock.",
    maxprice: `Products cannot cost more than ${formatIDR(100_000_000)}.`,
    failed: "Something went wrong. Please try again.",
  };

  const { data: profile } = await supabase
    .from("seller_profiles")
    .select("store_name, description, status, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/become-seller");

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, created_at, total_cents, order_items(id, product_name, quantity), shipments(packed_at, shipped_at, delivered_at)"
    )
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price_cents, stock, status, image_urls, created_at")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{profile.store_name}</h1>
          <p className="mt-1 text-muted-foreground">
            {profile.description || "Seller dashboard"}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
            profile.status === "active"
              ? "bg-emerald-500/10 text-emerald-600"
              : profile.status === "rejected"
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/10 text-amber-600"
          }`}
        >
          {profile.status}
        </span>
      </div>

      {profile.status !== "active" && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          {profile.status === "pending"
            ? "Your store is pending admin approval. You can prepare products but they will not be visible to buyers until approved."
            : "Your store application was rejected. Contact an admin for more information."}
        </div>
      )}

      {error && messages[error] && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {messages[error]}
        </p>
      )}

      <section id="orders" className="mb-10 scroll-mt-24">
        <h2 className="mb-4 text-xl font-semibold">Incoming Orders</h2>

        {orders?.length === 0 ? (
          <p className="text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="space-y-4">
            {orders?.map((o) => {
              const s = deriveShipmentStatus(o);
              return (
                <div key={o.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{o.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {o.order_items
                          ?.slice(0, 2)
                          .map((it) => it.product_name)
                          .join(", ")}
                        {o.order_items && o.order_items.length > 2
                          ? ` +${o.order_items.length - 2} more`
                          : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold">{formatIDR(o.total_cents)}</span>
                    {s.step ? (
                      <ShipmentActions orderId={o.id} step={s.step} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {s.label === "delivered"
                          ? "Delivered"
                          : s.label === "cancelled"
                            ? "Cancelled"
                            : "Shipment complete"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Products</h2>
          <Link
            href="/seller/products/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Add product
          </Link>
        </div>

        {products?.length === 0 ? (
          <p className="text-muted-foreground">You have no products yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Price</th>
                  <th className="px-4 py-2 font-medium">Stock</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products?.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="flex items-center gap-3 px-4 py-2">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                        {p.image_urls?.[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_urls[0]}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <span className="line-clamp-1">{p.name}</span>
                    </td>
                    <td className="px-4 py-2">{formatIDR(p.price_cents)}</td>
                    <td className="px-4 py-2">{p.stock}</td>
                    <td className="capitalize px-4 py-2">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}