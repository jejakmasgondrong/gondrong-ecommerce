"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return redirect("/");
  return supabase;
}

export async function approveSeller(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const userId = String(formData.get("user_id") || "");

  const { error } = await supabase
    .from("seller_profiles")
    .update({ status: "active", approved_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) return redirect("/admin?error=failed");

  revalidatePath("/admin");
  redirect("/admin");
}

export async function rejectSeller(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const userId = String(formData.get("user_id") || "");

  const { error } = await supabase
    .from("seller_profiles")
    .update({ status: "rejected" })
    .eq("user_id", userId);

  if (error) return redirect("/admin?error=failed");

  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteProduct(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id") || "");
  if (!id) return redirect("/admin?error=failed");

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) return redirect("/admin?error=failed");

  revalidatePath("/admin");
  revalidatePath("/products");
  revalidatePath("/");
  redirect("/admin");
}

export async function toggleProductStatus(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id") || "");
  if (!id) return redirect("/admin?error=failed");

  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (fetchError || !product) return redirect("/admin?error=failed");

  const next = product.status === "active" ? "inactive" : "active";
  const { error } = await supabase
    .from("products")
    .update({ status: next })
    .eq("id", id);

  if (error) return redirect("/admin?error=failed");

  revalidatePath("/admin");
  revalidatePath("/products");
  revalidatePath("/");
  redirect("/admin");
}

export async function setUserRole(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const userId = String(formData.get("user_id") || "");
  const role = String(formData.get("role") || "");

  if (!userId || !["buyer", "seller", "admin"].includes(role)) {
    return redirect("/admin?error=failed");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return redirect("/admin?error=failed");

  revalidatePath("/admin");
  redirect("/admin");
}

export async function createCategory(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const name = String(formData.get("name") || "").trim();
  if (!name) return redirect("/admin?error=failed");

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { error } = await supabase.from("categories").insert({ name, slug });

  if (error) return redirect("/admin?error=failed");

  revalidatePath("/admin");
  redirect("/admin");
}

export async function deleteCategory(formData: FormData) {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id") || "");
  if (!id) return redirect("/admin?error=failed");

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) return redirect("/admin?error=failed");

  revalidatePath("/admin");
  revalidatePath("/products");
  redirect("/admin");
}