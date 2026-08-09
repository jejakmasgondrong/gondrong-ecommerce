import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/format";
import AddToCartButton from "@/components/add-to-cart-button";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("name, description")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return { title: "Product not found" };

  return {
    title: data.name,
    description: data.description || `${data.name} on GondrongShop.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*, categories(name)")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (!product) notFound();

  const images = product.image_urls ?? [];
  const outOfStock = product.stock <= 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border bg-muted">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[0]}
                alt={product.name}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-3">
              {(images as string[]).slice(1).map(
                (src: string, i: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt={`${product.name} ${i + 2}`}
                    className="h-20 w-20 rounded-lg border object-cover"
                  />
                ),
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-3xl font-extrabold text-primary">
            {formatIDR(product.price_cents)}
          </p>
          <p className="text-muted-foreground">{product.description}</p>

          <div className="flex items-center gap-2 text-sm">
            <span
              className={
                outOfStock
                  ? "rounded-full bg-destructive/10 px-3 py-1 font-medium text-destructive"
                  : "rounded-full bg-emerald-500/10 px-3 py-1 font-medium text-emerald-600"
              }
            >
              {outOfStock ? "Out of stock" : `${product.stock} in stock`}
            </span>
          </div>

          {!outOfStock && <AddToCartButton productId={product.id} />}
        </div>
      </div>
    </div>
  );
}