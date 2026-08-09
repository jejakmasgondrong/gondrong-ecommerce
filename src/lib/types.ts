export type Product = {
  id: string;
  seller_id: string | null;
  category_id: string | null;
  name: string;
  description: string;
  price_cents: number;
  stock: number;
  image_urls: string[];
  status: string;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Ewallet = {
  balance_cents: number;
  last_refresh_date: string;
};