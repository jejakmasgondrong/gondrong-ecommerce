export function formatIDR(cents: number | bigint): string {
  const value = typeof cents === "bigint" ? Number(cents) : Number(cents);
  const idr = value / 100;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(idr);
}