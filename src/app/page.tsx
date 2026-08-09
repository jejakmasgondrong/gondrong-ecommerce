import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/product-card";
import WelcomePopup from "@/components/welcome-popup";
import HorizontalScroll from "@/components/horizontal-scroll";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const { data: products } = await supabase
    .from("products")
    .select("id, seller_id, category_id, name, description, price_cents, stock, image_urls, status, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const list: Product[] = (products as Product[]) ?? [];

  const flashSale = list.slice(0, 8);
  const recommended = [...list].reverse().slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      {/* Hero */}
      <section className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Full-stack e-commerce demo
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Everything you need,{" "}
          <span className="text-primary">in one place</span>
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Browse products, add to cart, and check out with simulated payments.
          Track your order&apos;s journey from packing to delivery in minutes.
          Every new account starts with Rp 10.000.000 in simulated credits.
        </p>
      </section>

      <section className="mb-12 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Shop",
            body: "Browse a curated catalog of products across categories, each with photos, pricing, and stock availability.",
          },
          {
            title: "Checkout",
            body: "Add items to your cart and pay in seconds with a simulated QRIS, virtual account, or card — every new user starts with Rp 10.000.000 in ewallet credits.",
          },
          {
            title: "Track",
            body: "Watch your order move from packing to shipped to delivered, with realtime notifications and a live order timeline.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border p-5">
            <h3 className="mb-1 font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      {params.welcome === "1" && <WelcomePopup />}

      {flashSale.length > 0 && (
        <HorizontalScroll title="Flash Sale" icon="⚡">
          {flashSale.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </HorizontalScroll>
      )}

      {recommended.length > 0 && (
        <HorizontalScroll title="Recommended for You" icon="✨">
          {recommended.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </HorizontalScroll>
      )}

      <section className="mt-12">
        <h2 className="mb-4 text-2xl font-bold">All Products</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}