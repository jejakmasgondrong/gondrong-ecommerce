import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/format";
import CartItemControls from "@/components/cart-item-controls";

export const metadata: Metadata = {
  title: "Cart",
};

export default async function CartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // middleware redirects, but guard for safety

  const { data: cart } = await supabase
    .from("carts")
    .select(
      "id, cart_items(id, quantity, product_id, products(id, name, price_cents, stock, image_urls, seller_id, status))"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const items =
    cart?.cart_items?.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => item.products?.[0]?.status === "active"
    ) ?? [];

  const totalCents = items.reduce(
    (sum, item) => sum + item.products[0].price_cents * item.quantity,
    0
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border p-4"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.products[0].image_urls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.products[0].image_urls[0]}
                    alt={item.products[0].name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${item.products[0].id}`}
                  className="line-clamp-2 font-medium hover:underline"
                >
                  {item.products[0].name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatIDR(item.products[0].price_cents)}
                </p>
              </div>
              <CartItemControls
                itemId={item.id}
                initialQuantity={item.quantity}
              />
              <p className="w-24 text-right font-semibold">
                {formatIDR(item.products[0].price_cents * item.quantity)}
              </p>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
            <p className="text-lg font-semibold">
              Total:{" "}
              <span className="text-primary">{formatIDR(totalCents)}</span>
            </p>
            <Link
              href="/checkout"
              className="rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}