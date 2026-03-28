import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "./rateLimit";

/**
 * Rate limit configuration for candidate view endpoints.
 *
 * 30 views per hour per employer. This prevents data harvesting
 * by making bulk candidate profile viewing structurally slow.
 *
 * The key is scoped by employer ID, not by IP — so all users
 * under the same employer share the same rate limit window.
 */
const CANDIDATE_VIEW_WINDOW_SECONDS = 3600; // 1 hour
const CANDIDATE_VIEW_MAX_HITS = 30;

export type RateLimitCheckResult =
  | { allowed: true }
  | { allowed: false; response: Response };

/**
 * Check candidate view rate limit for an employer.
 *
 * Returns { allowed: true } if under the limit.
 * Returns { allowed: false, response } with a 429 response if over the limit.
 *
 * Usage in API routes:
 * ```
 * const rl = await checkCandidateViewRateLimit(ctx.employerId, req);
 * if (!rl.allowed) return rl.response;
 * ```
 */
export async function checkCandidateViewRateLimit(
  employerId: string,
  req: Request
): Promise<RateLimitCheckResult> {
  const clientIp = getClientIp(req);
  void clientIp;
  const key = `candidate_view:${employerId}`;
  const result = await checkRateLimit(
    key,
    CANDIDATE_VIEW_WINDOW_SECONDS,
    CANDIDATE_VIEW_MAX_HITS
  );

  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil(result.reset_ms / 1000);
    return {
      allowed: false,
      response: NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMITED",
          message: `You've viewed too many candidate profiles. Please wait ${retryAfterSeconds} seconds before viewing more.`,
          retry_after_seconds: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Limit": String(CANDIDATE_VIEW_MAX_HITS),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset-Ms": String(result.reset_ms),
          },
        }
      ),
    };
  }

  return { allowed: true };
}
