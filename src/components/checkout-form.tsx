"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { placeOrder } from "@/lib/checkout/actions";
import { formatIDR } from "@/lib/format";
import { ADMIN_ORIGIN, haversineKm, shippingCost } from "@/lib/geo";
import type { SellerGroup, SellerInfo } from "@/app/checkout/page";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Processing…" : "Place Order"}
    </button>
  );
}

export default function CheckoutForm({
  groups,
  sellers,
}: {
  groups: SellerGroup[];
  sellers: SellerInfo[];
}) {
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Indonesia");
  const [geocode, setGeocode] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const bySeller = useMemo(() => {
    const map = new Map<string, SellerInfo>();
    for (const s of sellers) map.set(s.user_id, s);
    return map;
  }, [sellers]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let shipping = 0;
    for (const g of groups) {
      for (const it of g.items) subtotal += it.price_cents * it.quantity;
      const seller = bySeller.get(g.seller_id);
      const originLat = seller?.origin_lat ?? ADMIN_ORIGIN.lat;
      const originLng = seller?.origin_lng ?? ADMIN_ORIGIN.lng;
      let cents: number;
      if (geocode) {
        const dist = haversineKm({ lat: originLat, lng: originLng }, geocode);
        cents = shippingCost(dist).cents;
      } else {
        cents = 15000; // default full fee before geocoding
      }
      shipping += cents;
    }
    return { subtotal, shipping, total: subtotal + shipping };
  }, [groups, bySeller, geocode]);

  async function lookupAddress() {
    setGeocoding(true);
    setGeoError(null);
    try {
      const query = `${street}, ${city}, ${country}`.trim();
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      const res = await fetch(url, {
        headers: { "User-Agent": "gondrongecommerce-demo" },
      });
      if (!res.ok) throw new Error("Geocode failed");
      const data = (await res.json()) as {
        lat: string;
        lng: string;
        display_name: string;
      }[];
      if (!data?.[0]) throw new Error("Address not found");
      setGeocode({
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lng),
        label: data[0].display_name,
      });
    } catch (e) {
      setGeoError(e instanceof Error ? e.message : "Geocoding failed");
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <form action={placeOrder} className="space-y-6">
      {/* Address */}
      <section className="rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-semibold">Delivery address</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="street" className="mb-1 block text-sm font-medium">
              Street address
            </label>
            <input
              id="street"
              name="street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              required
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="city" className="mb-1 block text-sm font-medium">
              City
            </label>
            <input
              id="city"
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label
              htmlFor="country"
              className="mb-1 block text-sm font-medium"
            >
              Country
            </label>
            <input
              id="country"
              name="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            type="button"
            onClick={lookupAddress}
            disabled={geocoding || !street || !city}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {geocoding ? "Checking address…" : "Geocode address"}
          </button>
          {geocode && (
            <p className="mt-2 text-sm text-muted-foreground">
              Shipping calculated from: <span className="font-medium">{geocode.label}</span>
            </p>
          )}
          {geoError && (
            <p className="mt-2 text-sm text-destructive">{geoError}</p>
          )}
        </div>

        {/* Hidden geocode values for the server action */}
        <input type="hidden" name="lat" value={geocode?.lat ?? 0} />
        <input type="hidden" name="lng" value={geocode?.lng ?? 0} />
      </section>

      {/* Per-seller summaries */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your order</h2>
        {groups.map((g) => {
          const seller = bySeller.get(g.seller_id);
          const sub = g.items.reduce(
            (s, it) => s + it.price_cents * it.quantity,
            0
          );
          const originLat = seller?.origin_lat ?? ADMIN_ORIGIN.lat;
          const originLng = seller?.origin_lng ?? ADMIN_ORIGIN.lng;
          const dist = geocode
            ? haversineKm({ lat: originLat, lng: originLng }, geocode)
            : 0;
          const ship = geocode ? shippingCost(dist).cents : 15000;
          return (
            <div key={g.seller_id} className="rounded-xl border p-5">
              <p className="mb-3 font-semibold">
                {seller?.store_name || "Seller"}
              </p>
              <div className="space-y-2">
                {g.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                      {it.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.image_url}
                          alt={it.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <span className="flex-1 line-clamp-2">{it.name}</span>
                    <span className="text-muted-foreground">×{it.quantity}</span>
                    <span className="w-20 text-right font-medium">
                      {formatIDR(it.price_cents * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 border-t pt-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatIDR(sub)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatIDR(ship)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatIDR(sub + ship)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Grand total */}
      <div className="flex items-center justify-between rounded-xl border p-5 text-lg font-bold">
        <span>Grand total</span>
        <span className="text-primary">{formatIDR(totals.total)}</span>
      </div>

      <div className="rounded-xl border p-5">
        <p className="mb-2 text-sm font-medium">Payment method</p>
        <p className="text-xs text-muted-foreground">
          Ewallet (simulated) — Rp 10.000.000 credits will be deducted
          automatically when you place the order.
        </p>
      </div>

      <Submit />
    </form>
  );
}