import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/auth/callback",
  "/auth/confirm",
  "/auth/auth-code-error",
  "/api/auth/signup",
  "/api/auth/send-signin-link",
  // Public deal pages (anyone can view a deal by slug)
  "/deal",
  // Public user profiles
  "/u",
  // Public deals catalog
  "/deals",
  // Public browse gigs page
  "/gigs",
  // Static informational pages
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/blog",
  "/how-it-works",
  "/for-freelancers",
  "/for-clients",
];

export async function updateSession(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return NextResponse.next({ request });
  }
  const pathname = request.nextUrl.pathname;
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
