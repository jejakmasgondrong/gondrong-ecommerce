import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckoutForm from "@/components/checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({
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
  const { data: cart } = await supabase
    .from("carts")
    .select(
      "id, cart_items(id, quantity, product_id, products(id, name, price_cents, stock, image_urls, seller_id, status))"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const raw =
    (cart?.cart_items as
      | {
          id: string;
          quantity: number;
          products: {
            id: string;
            name: string;
            price_cents: number;
            stock: number;
            image_urls: string[];
            seller_id: string;
            status: string;
          }[];
        }[]
      | undefined) ?? [];
  const items = raw.filter((i) => i.products[0]?.status === "active");

  if (items.length === 0) redirect("/cart");

  const entries: SellerGroup[] = [];
  for (const it of items) {
    const p = it.products[0];
    let g = entries.find((e) => e.seller_id === p.seller_id);
    if (!g) {
      g = { seller_id: p.seller_id, items: [] };
      entries.push(g);
    }
    g.items.push({
      id: p.id,
      name: p.name,
      price_cents: p.price_cents,
      stock: p.stock,
      image_url: p.image_urls?.[0] ?? null,
      quantity: it.quantity,
      cart_item_id: it.id,
    });
  }

  const sellerIds = entries.map((e) => e.seller_id);
  const { data: sellers } = await supabase
    .from("seller_profiles")
    .select("user_id, store_name, origin_lat, origin_lng")
    .in("user_id", sellerIds)
    .eq("status", "active");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Checkout</h1>

      {error === "address" && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Please fill in your delivery address.
        </p>
      )}
      {error === "empty" && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Your cart is empty.
        </p>
      )}
      {error === "stock" && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          One or more items are no longer in stock.
        </p>
      )}
      {error === "failed" && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Something went wrong. Please try again.
        </p>
      )}

      <CheckoutForm groups={entries} sellers={sellers ?? []} />
    </div>
  );
}

export type SellerGroup = {
  seller_id: string;
  items: {
    id: string;
    name: string;
    price_cents: number;
    stock: number;
    image_url: string | null;
    quantity: number;
    cart_item_id: string;
  }[];
};

export type SellerInfo = {
  user_id: string;
  store_name: string;
  origin_lat: number | null;
  origin_lng: number | null;
};