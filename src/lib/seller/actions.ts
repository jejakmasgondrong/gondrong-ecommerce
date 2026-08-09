"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_PRICE_CENTS = 100_000_000; // Rp 1.000.000

export async function applyAsSeller(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const storeName = String(formData.get("storeName") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!storeName) return redirect("/become-seller?error=name");

  // Create seller profile (status pending by default).
  const { error: sellerError } = await supabase
    .from("seller_profiles")
    .insert({ user_id: user.id, store_name: storeName, description });

  if (sellerError) {
    if (sellerError.message.includes("duplicate")) {
      return redirect("/become-seller?error=exists");
    }
    return redirect("/become-seller?error=failed");
  }

  // Promote role so the seller area becomes reachable.
  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: "seller" })
    .eq("id", user.id);
  if (roleError) return redirect("/become-seller?error=failed");

  revalidatePath("/", "layout");
  redirect("/seller");
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price_cents"));
  const stock = Number(formData.get("stock"));
  const categoryId = String(formData.get("category_id") || "");

  if (!name || !Number.isFinite(price) || price <= 0) {
    return redirect("/seller?error=invalid");
  }
  if (price > MAX_PRICE_CENTS) {
    return redirect("/seller?error=maxprice");
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return redirect("/seller?error=invalid");
  }

  const { error } = await supabase.from("products").insert({
    seller_id: user.id,
    category_id: categoryId || null,
    name,
    description,
    price_cents: Math.round(price),
    stock,
    image_urls: [],
    status: "active",
  });

  if (error) return redirect("/seller?error=failed");

  revalidatePath("/seller");
  revalidatePath("/products");
  redirect("/seller");
}