// Shipping cost calculation helpers.
//
// Real address geocoding uses OpenStreetMap/Nominatim (free, no API key).
// Shipping is a flat base fee scaled by distance with discount bands.

export const ADMIN_ORIGIN = { lat: -7.7828, lng: 110.367 }; // Tugu Yogyakarta

const BASE_SHIPPING_CENTS = 15000; // Rp 15.000 base shipping fee
const BANDS: { maxKm: number; discount: number }[] = [
  { maxKm: 50, discount: 0 },
  { maxKm: 500, discount: 0.3 },
  { maxKm: 2000, discount: 0.5 },
  { maxKm: 5000, discount: 0.7 },
  { maxKm: Infinity, discount: 0.9 },
];

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Haversine distance between two lat/lng points in km.
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Distance-based discount for a given distance in km.
export function distanceDiscount(km: number): number {
  const band = BANDS.find((b) => km <= b.maxKm) ?? BANDS[BANDS.length - 1];
  return band.discount;
}

export type ShippingQuote = {
  baseCents: number;
  discountPct: number;
  cents: number;
  distanceKm: number;
};

// Compute the discounted shipping fee for one seller.
export function shippingCost(distanceKm: number): ShippingQuote {
  const discountPct = distanceDiscount(distanceKm);
  const cents = Math.round(BASE_SHIPPING_CENTS * (1 - discountPct));
  return {
    baseCents: BASE_SHIPPING_CENTS,
    discountPct,
    cents,
    distanceKm: Math.round(distanceKm * 10) / 10,
  };
}

// Geocode a free-form address via OpenStreetMap Nominatim.
// Returns the first place match lat/lng, or null when not found.
export async function geocodeAddress(
  query: string
): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": "gondrongecommerce-demo" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { lat: string; lng: string }[];
  if (!data?.[0]) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lng) };
}