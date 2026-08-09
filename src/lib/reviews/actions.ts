"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function submitReview(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const productId = String(formData.get("product_id") || "");
  const orderId = String(formData.get("order_id") || "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") || "").trim().slice(0, 500);

  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect(`/products/${productId}`);
  }

  // Only buyers of this product can review it.
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .in("status", ["processing", "shipped", "delivered", "paid"])
    .maybeSingle();

  if (!order) redirect(`/products/${productId}`);

  // The product must be part of that order.
  const { data: item } = await supabase
    .from("order_items")
    .select("id")
    .eq("order_id", order.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (!item) redirect(`/products/${productId}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const authorName = profile?.full_name || profile?.email || "Anonymous";

  const { error } = await supabase.from("reviews").upsert(
    {
      order_id: order.id,
      product_id: productId,
      user_id: user.id,
      author_name: authorName,
      rating,
      comment,
    },
    { onConflict: "user_id,product_id" }
  );

  if (error) redirect(`/products/${productId}`);

  revalidatePath(`/products/${productId}`);
  redirect(`/products/${productId}`);
}