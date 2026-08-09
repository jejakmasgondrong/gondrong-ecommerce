import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProduct } from "@/lib/seller/actions";
import { formatIDR } from "@/lib/format";
import ProductImageUploader from "@/components/product-image-uploader";

export const metadata: Metadata = { title: "Edit Product" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!product) notFound();

  const { data: profile } = await supabase
    .from("seller_profiles")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) redirect("/become-seller");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link
        href="/seller"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mb-6 mt-2 text-3xl font-bold">Edit Product</h1>

      <form
        action={updateProduct as unknown as (fd: FormData) => Promise<void>}
        className="space-y-4"
      >
        <input type="hidden" name="id" value={id} />

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Product name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={product.name}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Photos</label>
          <ProductImageUploader initialImages={product.image_urls ?? []} />
        </div>
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={product.description}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="category_id" className="text-sm font-medium">
            Category
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={product.category_id ?? ""}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">No category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="price_cents" className="text-sm font-medium">
              Price (Rp)
            </label>
            <input
              id="price_cents"
              name="price_cents"
              type="number"
              min={1}
              max={100_000_000}
              required
              defaultValue={product.price_cents}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Maximum {formatIDR(100_000_000)} per product.
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="stock" className="text-sm font-medium">
              Stock
            </label>
            <input
              id="stock"
              name="stock"
              type="number"
              min={0}
              required
              defaultValue={product.stock}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}