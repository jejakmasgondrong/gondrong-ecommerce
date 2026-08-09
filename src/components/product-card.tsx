import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatIDR } from "@/lib/format";

export default function ProductCard({ product }: { product: Product }) {
  const image = product.image_urls?.[0];

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex w-56 shrink-0 flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
        <p className="text-sm font-bold text-primary">
          {formatIDR(product.price_cents)}
        </p>
        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>{product.stock > 0 ? `In stock` : "Out of stock"}</span>
        </div>
      </div>
    </Link>
  );
}