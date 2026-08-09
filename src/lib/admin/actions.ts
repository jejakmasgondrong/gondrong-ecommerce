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