"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WelcomePopup() {
  const [show, setShow] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Clear the welcome param from the URL after showing
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    window.history.replaceState({}, "", url);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
          🎉
        </div>
        <h2 className="text-2xl font-bold">Congratulations!</h2>
        <p className="mt-2 text-muted-foreground">
          You got <span className="font-bold text-primary">Rp 10.000.000</span>{" "}
          of simulated credits in your ewallet!
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          You can now browse products and start shopping.
        </p>
        <button
          onClick={() => {
            setShow(false);
            router.push("/");
          }}
          className="mt-6 w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90"
        >
          Start Shopping
        </button>
      </div>
    </div>
  );
}