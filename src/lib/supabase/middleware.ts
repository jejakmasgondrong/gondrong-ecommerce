import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Guest-only pages: logged-in users are sent home.
const GUEST_ONLY_PREFIXES = ["/login", "/register"];

// Login-required pages. Prefixes pointing to role-specific areas gate by role.
const PROTECTED_PREFIXES: { prefix: string; role?: "seller" | "admin" }[] = [
  { prefix: "/checkout" },
  { prefix: "/cart" },
  { prefix: "/orders" },
  { prefix: "/become-seller" },
  { prefix: "/seller", role: "seller" },
  { prefix: "/admin", role: "admin" },
];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isGuestOnly = GUEST_ONLY_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const protectedRoute = PROTECTED_PREFIXES.find((route) =>
    pathname.startsWith(route.prefix)
  );

  // No gate needed for public pages.
  if (!isGuestOnly && !protectedRoute) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guest-only pages redirect signed-in users to the homepage.
  if (isGuestOnly && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Everything below requires a signed-in user.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Role-gated areas need the profile role. Profile rows are created by the
  // handle_new_user trigger, so every user has one.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (protectedRoute?.role && profile?.role !== protectedRoute.role) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}