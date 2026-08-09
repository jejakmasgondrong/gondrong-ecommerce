"use client";

import { useFormStatus } from "react-dom";
import { updateShipmentStatus } from "@/lib/seller/actions";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Updating…" : children}
    </button>
  );
}

export default function ShipmentActions({
  orderId,
  step,
}: {
  orderId: string;
  step: "packed" | "shipped";
}) {
  return (
    <form action={updateShipmentStatus}>
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="step" value={step} />
      <SubmitButton>{step === "packed" ? "Mark packed" : "Mark shipped"}</SubmitButton>
    </form>
  );
}