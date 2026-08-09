/**
 * Seed script — categories, 20 admin products, admin seller profile.
 * Run: `npm run seed`
 * Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORIES = [
  { name: "Electronics", slug: "electronics" },
  { name: "Fashion", slug: "fashion" },
  { name: "Home & Living", slug: "home-living" },
  { name: "Beauty", slug: "beauty" },
  { name: "Sports", slug: "sports" },
  { name: "Toys", slug: "toys" },
  { name: "Books", slug: "books" },
  { name: "Food & Beverage", slug: "food-beverage" },
];

// 20 products: name, category slug, price in cents (Rp), stock, image seed
const PRODUCTS = [
  { name: "Wireless Mechanical Keyboard 75%", cat: "electronics", price: 899000, stock: 25, img: "keyboard-red-75" },
  { name: "1080p Webcam Built-in Mic", cat: "electronics", price: 350000, stock: 40, img: "webcam-black-1080" },
  { name: "Portable Bluetooth Speaker", cat: "electronics", price: 275000, stock: 60, img: "speaker-portable-blue" },
  { name: "USB-C 65W GaN Charger", cat: "electronics", price: 185000, stock: 0, img: "charger-gan-white" },
  { name: "Classic Denim Jacket", cat: "fashion", price: 450000, stock: 18, img: "denim-jacket-blue" },
  { name: "Minimalist Canvas Tote Bag", cat: "fashion", price: 95000, stock: 100, img: "tote-canvas-beige" },
  { name: "Running Sneakers Everyday", cat: "fashion", price: 620000, stock: 22, img: "sneakers-white-run" },
  { name: "Cotton Oversized Hoodie", cat: "fashion", price: 320000, stock: 45, img: "hoodie-oversized-grey" },
  { name: "Ceramic Vase Set of 2", cat: "home-living", price: 240000, stock: 18, img: "vase-ceramic-minimal" },
  { name: "Scented Soy Candle 200g", cat: "home-living", price: 145000, stock: 70, img: "candle-soy-vanilla" },
  { name: "Bamboo Cutting Board", cat: "home-living", price: 115000, stock: 55, img: "cuttingboard-bamboo" },
  { name: "Vitamin C Serum 30ml", cat: "beauty", price: 160000, stock: 80, img: "serum-vitc-amber" },
  { name: "Hyaluronic Moisturizer 50ml", cat: "beauty", price: 128000, stock: 65, img: "moisturizer-white" },
  { name: "Yoga Mat Anti-Slip 6mm", cat: "sports", price: 210000, stock: 50, img: "yogamat-turquoise" },
  { name: "Adjustable Dumbbell Set", cat: "sports", price: 780000, stock: 12, img: "dumbbell-black" },
  { name: "Wooden Block Puzzle Set", cat: "toys", price: 88000, stock: 90, img: "puzzle-wooden-color" },
  { name: "LEGO-style Space Ship Kit", cat: "toys", price: 540000, stock: 20, img: "legospace-kit-future" },
  { name: "The Pragmatic Programmer", cat: "books", price: 210000, stock: 33, img: "book-pragmatic-programmer" },
  { name: "Clean Code — Robert C. Martin", cat: "books", price: 190000, stock: 28, img: "book-clean-code" },
  { name: "Arabika Coffee Beans 250g", cat: "food-beverage", price: 130000, stock: 85, img: "coffee-beans-arabica" },
];

async function upsertCategories() {
  for (const c of CATEGORIES) {
    const { error } = await supabase
      .from("categories")
      .upsert(c, { onConflict: "slug" });
    if (error) throw new Error(`category ${c.slug}: ${error.message}`);
  }
  console.log(`Categories: ${CATEGORIES.length} ok`);
}

async function upsertProducts() {
  const { data: cats } = await supabase.from("categories").select("id, slug");

  // find admin seller (first active seller store). We seed admin products under the store named "Gondrong Official Store".
  // The admin user must exist. If missing, the script auto-creates via auth.admin.
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local before seeding."
    );
  }

  let adminId;
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", adminEmail)
    .single();
  if (existing) {
    adminId = existing.id;
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "Gondong Admin" },
    });
    if (error) throw new Error(`create admin: ${error.message}`);
    adminId = created.user.id;
  }

  // ensure seller_profile for admin with origin Tugu Yogyakarta
  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("user_id", adminId)
    .single();
  if (!seller) {
    // create address Tugu Yogyakarta lat -7.7828, lng 110.3670
    const { data: addr, error: addrErr } = await supabase
      .from("addresses")
      .insert({
        user_id: adminId,
        label: "Store Origin",
        street: "Around Tugu Yogyakarta, Malioboro",
        city: "Yogyakarta",
        country: "Indonesia",
        country_code: "ID",
        lat: -7.7828,
        lng: 110.367,
        is_default: true,
      })
      .select()
      .single();
    if (addrErr) throw new Error(`addr: ${addrErr.message}`);

    const { error: sellerErr } = await supabase.from("seller_profiles").insert({
      user_id: adminId,
      store_name: "Gondong Official Store",
      description: "Official demo store by Gondrong — Yogyakarta.",
      origin_address_id: addr.id,
      status: "active",
    });
    if (sellerErr) throw new Error(`seller: ${sellerErr.message}`);
  }

  for (const p of PRODUCTS) {
    const cat = cats.find((c) => c.slug === p.cat);
    if (!cat) throw new Error(`category not found: ${p.cat}`);

    // check existing product by name to avoid duplicates
    const { data: dup } = await supabase
      .from("products")
      .select("id")
      .eq("name", p.name)
      .maybeSingle();
    if (dup) {
      const { error } = await supabase
        .from("products")
        .update({
          price_cents: p.price,
          stock: p.stock,
          category_id: cat.id,
          status: p.stock > 0 ? "active" : "inactive",
        })
        .eq("id", dup.id);
      if (error) console.warn(`product ${p.name}: ${error.message}`);
      continue;
    }

    const imageUrl = `https://picsum.photos/seed/${p.img}/600/600`;
    const { error } = await supabase.from("products").insert({
      seller_id: adminId,
      category_id: cat.id,
      name: p.name,
      description: `High quality product — ${p.name}. Demo item sold by Gondong Official Store (photos are placeholders).`,
      price_cents: p.price,
      stock: p.stock,
      image_urls: [imageUrl],
      status: p.stock > 0 ? "active" : "inactive",
    });
    if (error) console.warn(`product ${p.name}: ${error.message}`);
  }

  console.log(`products: ${PRODUCTS.length} ok`);
  console.log("Seed complete.");
}

async function main() {
  await upsertCategories();
  await upsertProducts();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});