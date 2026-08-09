"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: boolean; error?: string };

export async function addToCart(productId: string, quantity = 1): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please sign in to add to cart." };
  }

  // find or create cart
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let cartId = cart?.id;
  if (!cartId) {
    const { data: newCart, error } = await supabase
      .from("carts")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    cartId = newCart.id;
  }

  // check existing quantity
  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: existing.quantity + quantity })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("cart_items").insert({
      cart_id: cartId,
      product_id: productId,
      quantity,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/cart");
  revalidatePath("/products");
  return { ok: true };
}

export async function updateCartItem(
  itemId: string,
  quantity: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Please sign in." };
  if (quantity < 1) return { ok: false, error: "Quantity must be at least 1." };

  // Ensure the item belongs to the signed-in user's cart.
  const { data: item, error: findError } = await supabase
    .from("cart_items")
    .select("carts(user_id)")
    .eq("id", itemId)
    .maybeSingle();
  if (findError || !item) {
    return { ok: false, error: "Item not found." };
  }
  // @ts-expect-error nested relation from select
  if (item.carts?.user_id !== user.id) {
    return { ok: false, error: "Item not found." };
  }

  const { error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", itemId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/cart");
  return { ok: true };
}

export async function removeCartItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Please sign in." };

  const { data: item, error: findError } = await supabase
    .from("cart_items")
    .select("carts(user_id)")
    .eq("id", itemId)
    .maybeSingle();
  if (findError || !item) {
    return { ok: false, error: "Item not found." };
  }
  // @ts-expect-error nested relation from select
  if (item.carts?.user_id !== user.id) {
    return { ok: false, error: "Item not found." };
  }

  const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/cart");
  return { ok: true };
}