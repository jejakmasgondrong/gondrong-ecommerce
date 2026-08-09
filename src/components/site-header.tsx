import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { formatIDR } from "@/lib/format";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let balanceCents: number | null = null;
  let role: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const { data: ewallet } = await supabase
      .from("ewallets")
      .select("balance_cents")
      .eq("user_id", user.id)
      .maybeSingle();

    role = profile?.role ?? "buyer";
    balanceCents = ewallet?.balance_cents ?? null;
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Gondrong<span className="text-primary">Shop</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <Link
            href="/products"
            className="text-muted-foreground hover:text-foreground"
          >
            Products
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {!user && (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Register
              </Link>
            </>
          )}

          {user && (
            <>
              <Link href="/buyer/" className="text-sm font-medium">
                Orders
              </Link>
              {role === "seller" && (
                <Link href="/seller/" className="text-sm font-medium">
                  Seller
                </Link>
              )}
              {role === "admin" && (
                <Link href="/admin/" className="text-sm font-medium">
                  Admin
                </Link>
              )}
              <span className="hidden rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground sm:inline">
                {balanceCents !== null
                  ? formatIDR(balanceCents)
                  : "Ewallet"}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
                >
                  Sign out
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}