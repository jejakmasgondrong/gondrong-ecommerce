# GondrongShop — Demo E-Commerce

A full-stack multi-role e-commerce demo (buyer / seller / admin) built with Next.js, Supabase, and Tailwind CSS. Payments and shipping are fully simulated — no real money, no real couriers — so you can explore a complete marketplace flow end-to-end in minutes.

**Live demo:** https://gondrongecommerce.vercel.app

## Features

**Buyer**
- Browse products by category with photos, pricing, stock, and reviews
- Cart with quantity management; checkout splits orders automatically per seller
- Simulated payments (QRIS / virtual account / card) paid from an e-wallet that starts at **Rp 10.000.000** (refreshed daily)
- Order tracking with a live timeline — packing → shipped → delivered
- Realtime notifications for order status changes
- Reviews & ratings (one per user + product, only for products the user bought)

**Seller**
- Request a seller account (approved by admin)
- Create / edit / delete products with photo upload (WebP, up to 3 photos)
- Incoming orders dashboard with **Mark packed / Mark shipped** actions
- Reviews made on your products

**Admin**
- Approve / reject seller applications
- Manage all products (activate / deactivate / delete)
- Manage user roles (buyer / seller / admin)
- Create / delete product categories

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** — PostgreSQL + Auth + Storage + Realtime
- **Node.js 20+**, npm

## Architecture

- Tables: `profiles`, `ewallets`, `addresses`, `seller_profiles`, `categories`, `products`, `carts`/`cart_items`, `orders`/`order_items`, `payments`, `shipments`, `notifications`, `reviews`
- Row Level Security (RLS) on every table; role-based policies for buyer / seller / admin
- Triggers: `handle_new_user` (profile + e-wallet on signup), `refresh_daily_balance` (daily top-up to Rp 10.000.000)
- Shipping simulation: sellers override real shipment timestamps (`packed_at` / `shipped_at`), with an event-time fallback timeline
- Shipping cost: base fee + distance discount (origin = Tugu Yogyakarta), computed server-side with Haversine + PostGIS
- Product photos stored in Supabase Storage bucket `product-images` (WebP, resized in-browser)
- Realtime notifications push via Supabase Realtime (`postgres_changes` on `notifications`)

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A Supabase project (local or hosted)

### Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/jejakmasgondrong/gondrong-ecommerce.git
   cd gondrong-ecommerce
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ADMIN_EMAIL=<admin-login-email>
   ADMIN_PASSWORD=<admin-login-password>
   ```

   Never commit `.env.local`.

4. **Apply the database schema + migrations**

   ```bash
   npm run db:setup        # or: supabase db push (when using the Supabase CLI)
   ```

5. **Seed data**

   ```bash
   npm run seed
   ```

   Seeds 8 categories and 20 products from the **Gondrong Official Store**.

6. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Register an account to get your Rp 10.000.000 e-wallet.

### Useful scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint check |
| `npm run seed` | Seed categories + products |
| `npm run db:setup` | Apply `supabase/schema.sql` via psql (SUPABASE_DB_URL must be set) |

## Project Structure

```text
src/
├── app/                  # App Router pages
│   ├── page.tsx          # Homepage (hero, flash sale, all products)
│   ├── products/         # Product list + detail (with reviews)
│   ├── cart/             # Shopping cart
│   ├── checkout/         # Checkout (per-seller split, shipping calc)
│   ├── orders/           # Buyer order list + tracking
│   ├── login/            # Auth pages (login / register)
│   ├── register/
│   ├── become-seller/    # Request a seller account
│   ├── seller/           # Seller dashboard + product management
│   ├── admin/            # Admin dashboard (sellers, products, users, categories)
│   ├── notifications/    # Notification inbox
│   └── proxy.ts          # Middleware (auth/role guards)
├── components/           # UI + feature components
└── lib/                  # Server/client helpers (Supabase clients, format, actions)
```

## Deployment (Vercel)

1. Push the repo to GitHub
2. Import the project in Vercel
3. Set the env vars above (production)
4. Deploy — a visible version badge (`v0.6.1`) renders in the footer automatically from `package.json`

## Notes

- This is a **demo**: payments, e-wallet creds and shipping are simulated. No real transactions occur.
- Devnet philosophy of the Solana projects does not apply here — this project is plain full-stack web.
- Troubleshooting regular issues can be found in `DEBUGGING.md`.

## License

MIT — free to use for learning or portfolio purposes.

## Author

Gondrong — [jejakmasgondrong](https://github.com/jejakmasgondrong)