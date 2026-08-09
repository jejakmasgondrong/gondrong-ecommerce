import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatIDR } from "@/lib/format";
import AddToCartButton from "@/components/add-to-cart-button";
import ReviewForm from "@/components/review-form";
import Stars from "@/components/stars";

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

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, author_name")
    .eq("product_id", id)
    .order("created_at", { ascending: false });

  const { data: existingReview } = userId
    ? await supabase
        .from("reviews")
        .select("id, rating, comment")
        .eq("product_id", id)
        .eq("user_id", userId)
        .maybeSingle()
    : { data: null };

  // Can review only if this buyer has a paid order containing the product.
  let canReview = false;
  if (userId) {
    const { data: purchased } = await supabase
      .from("order_items")
      .select("order_id, orders!inner(id, buyer_id, status)")
      .eq("product_id", id)
      .eq("orders.buyer_id", userId)
      .in("orders.status", ["processing", "shipped", "delivered", "paid"])
      .limit(1);
    canReview = (purchased ?? []).length > 0;
  }

  const totalReviews = reviews?.length ?? 0;
  const avgRating =
    totalReviews > 0
      ? (reviews ?? []).reduce((s, r) => s + r.rating, 0) / totalReviews
      : null;

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
          {avgRating !== null && (
            <div className="flex items-center gap-2 text-sm">
              <Stars rating={avgRating} />
              <span className="text-muted-foreground">
                {avgRating.toFixed(1)} · {totalReviews} review
                {totalReviews === 1 ? "" : "s"}
              </span>
            </div>
          )}
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

      {/* Reviews */}
      <section className="mt-14">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Reviews
            {totalReviews > 0 && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({totalReviews})
              </span>
            )}
          </h2>
          {avgRating !== null && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
              <Stars rating={avgRating} />
            </div>
          )}
        </div>

        {canReview && (
          <ReviewForm
            productId={product.id}
            existingRating={existingReview?.rating ?? null}
            existingComment={existingReview?.comment ?? ""}
          />
        )}

        {totalReviews === 0 ? (
          <p className="text-muted-foreground">No reviews yet.</p>
        ) : (
          <ul className="space-y-4">
            {reviews?.map((r) => {
              const name = r.author_name || "Anonymous";
              return (
                <li key={r.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Stars rating={r.rating} />
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {r.comment}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}