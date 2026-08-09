"use client";

import { useFormStatus } from "react-dom";
import { deleteProduct } from "@/lib/seller/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm text-destructive hover:underline disabled:opacity-50"
      onClick={(e) => {
        if (!window.confirm("Delete this product? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export default function DeleteProductButton({
  productId,
}: {
  productId: string;
}) {
  return (
    <form action={deleteProduct}>
      <input type="hidden" name="id" value={productId} />
      <SubmitButton />
    </form>
  );
}