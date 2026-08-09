"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_ORIGIN, haversineKm, shippingCost } from "@/lib/geo";

type CartService = {
  id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price_cents: number;
    stock: number;
    image_urls: string[];
    seller_id: string;
    status: string;
  }[];
};

type OrderGroup = {
  seller_id: string;
  seller_store_name: string;
  courier: string;
  subtotal_cents: number;
  shipping_cost_cents: number;
  total_cents: number;
  items: {
    product_id: string;
    product_name: string;
    product_price_cents: number;
    product_image_url: string | null;
    quantity: number;
  }[];
};

export async function placeOrder(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const addressStreet = String(formData.get("street") || "");
  const addressCity = String(formData.get("city") || "");
  const addressCountry = String(formData.get("country") || "");
  const addressLat = Number(formData.get("lat") || 0);
  const addressLng = Number(formData.get("lng") || 0);

  if (!addressStreet || !addressCity || !addressCountry) {
    return redirect("/checkout?error=address");
  }

  // Load cart with products (authoritative, RLS scoped to the buyer).
  const { data: cart } = await supabase
    .from("carts")
    .select(
      "id, cart_items(id, quantity, product_id, products(id, name, price_cents, stock, image_urls, seller_id, status))"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const cartItems: CartService[] =
    (cart?.cart_items as CartService[] | undefined)?.filter(
      (it) => it.products?.[0]?.status === "active"
    ) ?? [];
  if (cartItems.length === 0) return redirect("/checkout?error=empty");

  // Sanity-check requested stock quantities.
  for (const item of cartItems) {
    if (item.products[0].stock < item.quantity) {
      return redirect("/checkout?error=stock");
    }
  }

  // Group by seller.
  const bySeller = new Map<string, OrderGroup>();
  for (const item of cartItems) {
    const p = item.products[0];
    let group = bySeller.get(p.seller_id);
    if (!group) {
      group = {
        seller_id: p.seller_id,
        seller_store_name: p.seller_id,
        courier: "JNE",
        subtotal_cents: 0,
        shipping_cost_cents: 0,
        total_cents: 0,
        items: [],
      };
      bySeller.set(p.seller_id, group);
    }
    group.subtotal_cents += p.price_cents * item.quantity;
    group.items.push({
      product_id: p.id,
      product_name: p.name,
      product_price_cents: p.price_cents,
      product_image_url: p.image_urls?.[0] ?? null,
      quantity: item.quantity,
    });
  }

  // Load seller origins + store names (active sellers only, public RLS).
  const sellerIds = [...bySeller.keys()];
  const { data: sellerProfiles } = await supabase
    .from("seller_profiles")
    .select("user_id, store_name, origin_lat, origin_lng")
    .in("user_id", sellerIds)
    .eq("status", "active");

  const buyerPoint =
    addressLat && addressLng ? { lat: addressLat, lng: addressLng } : null;

  for (const group of bySeller.values()) {
    const seller = sellerProfiles?.find((s) => s.user_id === group.seller_id);
    if (seller?.store_name) group.seller_store_name = seller.store_name;

    // Origin: seller geolocation if known, otherwise the admin default.
    const originLat = seller?.origin_lat ?? ADMIN_ORIGIN.lat;
    const originLng = seller?.origin_lng ?? ADMIN_ORIGIN.lng;
    const distanceKm = buyerPoint
      ? haversineKm({ lat: originLat, lng: originLng }, buyerPoint)
      : 0;
    const shippingCents =
      distanceKm === 0
        ? 15000
        : shippingCost(distanceKm).cents;
    group.shipping_cost_cents = shippingCents;
    group.total_cents = group.subtotal_cents + group.shipping_cost_cents;
  }

  const ordersPayload = [...bySeller.values()].map((g) => ({
    seller_id: g.seller_id,
    seller_store_name: g.seller_store_name,
    courier: g.courier,
    subtotal_cents: g.subtotal_cents,
    shipping_cost_cents: g.shipping_cost_cents,
    total_cents: g.total_cents,
    items: g.items,
  }));

  const { data, error } = await supabase.rpc("place_order", {
    p_buyer_id: user.id,
    p_address_street: addressStreet,
    p_address_city: addressCity,
    p_address_country: addressCountry,
    p_address_country_code: "ID",
    p_address_lat: addressLat,
    p_address_lng: addressLng,
    p_orders: ordersPayload,
  });

  if (error || !data?.ok) {
    revalidatePath("/checkout");
    return redirect("/checkout?error=failed");
  }

  revalidatePath("/");
  revalidatePath("/cart");
  redirect("/orders");
}