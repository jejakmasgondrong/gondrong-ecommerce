import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/product-card";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse all products on GondrongShop.",
};

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, seller_id, category_id, name, description, price_cents, stock, image_urls, status, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const products = (data as Product[]) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">All Products</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {products.length === 0 && (
        <p className="text-muted-foreground">No products yet.</p>
      )}
    </div>
  );
}