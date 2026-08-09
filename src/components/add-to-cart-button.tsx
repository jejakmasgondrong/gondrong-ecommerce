"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/cart/actions";

export default function AddToCartButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function handle() {
    startTransition(async () => {
      const res = await addToCart(productId, 1);
      if (res.ok) {
        setMessage("Added to cart ✓");
        router.refresh();
      } else {
        setMessage(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handle}
        disabled={isPending}
        className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {isPending ? "Adding…" : "Add to Cart"}
      </button>
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}