import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applyAsSeller } from "@/lib/seller/actions";

export const metadata: Metadata = { title: "Become a Seller" };

export default async function BecomeSellerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already a seller? Keep them in the seller area.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "seller") redirect("/seller");

  const { error } = await searchParams;
  const errors: Record<string, string> = {
    name: "Store name is required.",
    exists: "You already have a seller account.",
    failed: "Something went wrong. Please try again.",
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Become a Seller</h1>
      <p className="mb-6 text-muted-foreground">
        Open your own store and start selling. Your application is reviewed by
        an admin before you can publish products.
      </p>

      {error && errors[error] && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors[error]}
        </p>
      )}

      <form
        action={applyAsSeller as unknown as (fd: FormData) => Promise<void>}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label htmlFor="storeName" className="text-sm font-medium">
            Store name
          </label>
          <input
            id="storeName"
            name="storeName"
            required
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90"
        >
          Request seller account
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Not sure yet?{" "}
        <Link href="/" className="font-medium underline">
          Back to shopping
        </Link>
      </p>
    </div>
  );
}