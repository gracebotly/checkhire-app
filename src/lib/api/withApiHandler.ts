import { NextResponse } from "next/server";

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

export function withApiHandler<TArgs extends unknown[]>(
  handler: ApiHandler<TArgs>,
): ApiHandler<TArgs> {
  return async (...args: TArgs): Promise<Response> => {
    try {
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
