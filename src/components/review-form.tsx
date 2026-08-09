"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";
import { submitReview } from "@/lib/reviews/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Submitting…" : "Submit review"}
    </button>
  );
}

export default function ReviewForm({
  productId,
  existingRating,
  existingComment,
}: {
  productId: string;
  existingRating: number | null;
  existingComment: string;
}) {
  const [rating, setRating] = useState(existingRating ?? 0);
  const [hover, setHover] = useState(0);

  return (
    <form
      action={submitReview}
      className="mb-8 space-y-3 rounded-xl border p-4"
    >
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="rating" value={rating} />

      <p className="text-sm font-medium">
        {existingRating ? "Update your review" : "Write a review"}
      </p>

      <div className="flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} stars`}
            className={
              n <= (hover || rating)
                ? "text-amber-400"
                : "text-muted-foreground opacity-40"
            }
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        name="comment"
        rows={3}
        placeholder="Share your experience (optional)"
        maxLength={500}
        defaultValue={existingComment}
        className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      <SubmitButton />
    </form>
  );
}