"use client";

import { useFormStatus } from "react-dom";
import { deleteProduct } from "@/lib/admin/actions";

function SubmitButton({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      data-confirm={`Delete "${name}"? This cannot be undone.`}
      className="rounded-md border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-accent disabled:opacity-50"
      onClick={(e) => {
        if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export default function AdminDeleteProductButton({
  productId,
  name,
}: {
  productId: string;
  name: string;
}) {
  return (
    <form action={deleteProduct}>
      <input type="hidden" name="id" value={productId} />
      <SubmitButton name={name} />
    </form>
  );
}