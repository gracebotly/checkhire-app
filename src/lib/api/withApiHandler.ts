import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ApiErrorBody = {
  ok: false;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  userAction?: "fix_credentials" | "retry_later" | "contact_support";
};

type JsonLikeRecord = Record<string, unknown>;
type ApiHandler<TArgs extends unknown[]> = (...args: TArgs) => Promise<Response>;

async function extractUserHint(req: Request): Promise<string> {
  try {
    if (req.method === "GET" || req.method === "HEAD") {
      const url = new URL(req.url);
      return url.searchParams.get("user_id") || "unknown";
    }
    const clone = req.clone();
    const body: unknown = await clone.json();
    if (!body || typeof body !== "object") {
      return "unknown";
    }
    const jsonBody = body as JsonLikeRecord;
    const userId = jsonBody.userId;
    if (typeof userId === "string" && userId.length > 0) {
      return userId;
    }
    const snakeUserId = jsonBody.user_id;
    if (typeof snakeUserId === "string" && snakeUserId.length > 0) {
      return snakeUserId;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Check if the current user is suspended.
 * Returns null if no user session or user is not suspended.
 * Returns a 403 Response if the user is suspended.
 *
 * Skips for: admin routes, auth routes, GET requests (read-only).
 */
async function checkSuspension(req: Request): Promise<Response | null> {
  const url = new URL(req.url);

  // Skip admin routes — admins manage suspended users
  if (url.pathname.startsWith("/api/admin")) return null;

  // Skip auth routes — login/signup/logout need to work
  if (url.pathname.startsWith("/api/auth")) return null;

  // Skip GET — reading deal pages, profiles is fine
  if (req.method === "GET") return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("suspended")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.suspended) {
      return NextResponse.json(
        {
          ok: false,
          code: "ACCOUNT_SUSPENDED",
          message:
            "Your account has been suspended. Please contact support@checkhire.co for assistance.",
          userAction: "contact_support" as const,
        },
        { status: 403 }
      );
    }
  } catch {
    // If check fails, don't block — Auth-level ban is the primary layer
    console.error("[withApiHandler] Suspension check failed, proceeding");
  }

  return null;
}

export function withApiHandler<TArgs extends unknown[]>(
  handler: ApiHandler<TArgs>,
): ApiHandler<TArgs> {
  return async (...args: TArgs): Promise<Response> => {
    try {
      // Suspension check (Layer 2 — app level)
      const maybeReq = args[0];
      if (maybeReq instanceof Request) {
        const suspensionResponse = await checkSuspension(maybeReq);
        if (suspensionResponse) return suspensionResponse;
      }

      return await handler(...args);
    } catch (err) {
      const maybeReq = args[0];
      const req = maybeReq instanceof Request ? maybeReq : undefined;
      const method = req?.method ?? "UNKNOWN";
      const url = req?.url ?? "unknown-url";
      const userHint = req ? await extractUserHint(req) : "unknown";

      console.error(
        `[API Error] ${method} ${url} | user=${userHint} |`,
        err,
      );

      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";

      const body: ApiErrorBody = {
        ok: false,
        code: "INTERNAL_ERROR",
        message,
        userAction: "retry_later",
      };

      return NextResponse.json(body, { status: 500 });
    }
  };
}
