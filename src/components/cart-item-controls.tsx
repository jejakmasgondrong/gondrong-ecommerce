"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCartItem, removeCartItem } from "@/lib/cart/actions";

export default function CartItemControls({
  itemId,
  initialQuantity,
}: {
  itemId: string;
  initialQuantity: number;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function changeBy(delta: number) {
    const next = Math.max(1, initialQuantity + delta);
    if (next === initialQuantity) return;
    startTransition(async () => {
      await updateCartItem(itemId, next);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await removeCartItem(itemId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center rounded-md border">
        <button
          onClick={() => changeBy(-1)}
          disabled={isPending || initialQuantity <= 1}
          className="px-3 py-1 text-lg disabled:opacity-40"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="min-w-8 text-center text-sm font-medium">
          {initialQuantity}
        </span>
        <button
          onClick={() => changeBy(1)}
          disabled={isPending}
          className="px-3 py-1 text-lg disabled:opacity-40"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
      <button
        onClick={remove}
        disabled={isPending}
        className="text-sm font-medium text-destructive hover:underline disabled:opacity-40"
      >
        Remove
      </button>
    </div>
  );
}