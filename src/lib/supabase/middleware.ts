import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/auth-code-error",
  "/auth/post-login",
  "/auth/reset-password",
  "/deal",
  "/u",
  "/deals",
  "/gigs",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/blog",
  "/how-it-works",
  "/create",
  "/faq",
  "/for-freelancers",
  "/for-clients",
];

export async function updateSession(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return NextResponse.next({ request });
  }

  const pathname = request.nextUrl.pathname;

  // Skip API routes — they handle their own auth
  if (pathname.startsWith("/api/")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRITICAL: Always call getUser() to refresh the session.
  // Do NOT use getSession() — it doesn't validate the token with the server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // These paths live under public prefixes but require authentication
  const PROTECTED_UNDER_PUBLIC = [
    "/deal/new",
  ];

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  const isProtectedOverride = PROTECTED_UNDER_PUBLIC.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // Authenticated user on landing page → redirect to dashboard
  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Unauthenticated user on a protected page → redirect to login
  if (!user && (!isPublic || isProtectedOverride)) {
    const url = request.nextUrl.clone();
    // Preserve the full path including query params (e.g., /deal/new?category=video&from_wizard=1)
    const fullPath = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", fullPath);
    return NextResponse.redirect(url);
  }

  // Admin route protection — check if user is admin
  if (user && pathname.startsWith("/admin")) {
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (serviceKey) {
      const serviceClient = createServerClient(serviceUrl, serviceKey, {
        cookies: {
          getAll() { return []; },
          setAll() {},
        },
        auth: { persistSession: false },
      });

      const { data: profile } = await serviceClient
        .from("user_profiles")
        .select("is_platform_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.is_platform_admin) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
