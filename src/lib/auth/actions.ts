"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const fullName = String(formData.get("fullName") || "");
  const email = String(formData.get("email") || "").toLowerCase();
  const password = String(formData.get("password") || "");

  if (!fullName || !email || !password) {
    return { error: "All fields are required." };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: "buyer" },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Sign in immediately (dev flow; Supabase allows without email confirmation
  // when email confirmation is disabled in project settings).
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: signInError.message };
  }

  revalidatePath("/", "layout");
  redirect("/?welcome=1");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") || "").toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}