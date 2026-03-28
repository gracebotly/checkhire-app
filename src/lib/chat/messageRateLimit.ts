import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Rate limit: employers can start at most 20 NEW chat threads per day.
 *
 * A "new thread" = first message sent by the employer on a given application_id.
 * This prevents mass outreach (a soft form of data harvesting where employers
 * spam dozens of candidates with copy-paste messages to collect responses).
 *
 * This does NOT limit replies within existing threads — only new conversations.
 *
 * @param employerUserId - The individual employer user (not the company ID)
 * @param applicationId - The application they're trying to message
 * @returns { allowed: true } or { allowed: false, response: 429 Response }
 */
export async function checkMessageThreadRateLimit(
  employerUserId: string,
  applicationId: string
): Promise<{ allowed: true } | { allowed: false; response: Response }> {
  try {
    // First check: does a message from this employer already exist on this application?
    // If so, this is a reply to an existing thread — always allowed.
    const { data: existingMessage } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("application_id", applicationId)
      .eq("sender_id", employerUserId)
      .eq("sender_type", "employer")
      .limit(1)
      .maybeSingle();

    if (existingMessage) {
      // Existing thread — no rate limit on replies
      return { allowed: true };
    }

    // New thread — count how many distinct threads this employer started today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayThreads, error } = await supabaseAdmin
      .from("messages")
      .select("application_id")
      .eq("sender_id", employerUserId)
      .eq("sender_type", "employer")
      .gte("created_at", todayStart.toISOString());

    if (error) {
      // Fail open — don't block legitimate users if query fails
      console.error("[messageRateLimit] Query error:", error.message);
      return { allowed: true };
    }

    // Count distinct application_ids
    const distinctThreads = new Set(
      (todayThreads || []).map((m: { application_id: string }) => m.application_id)
    );

    const MAX_NEW_THREADS_PER_DAY = 20;

    if (distinctThreads.size >= MAX_NEW_THREADS_PER_DAY) {
      return {
        allowed: false,
        response: NextResponse.json(
          {
            ok: false,
            code: "THREAD_RATE_LIMITED",
            message: `You've started ${MAX_NEW_THREADS_PER_DAY} new conversations today. You can continue existing conversations, but new ones are limited to ${MAX_NEW_THREADS_PER_DAY} per day.`,
          },
          {
            status: 429,
            headers: { "Retry-After": "86400" },
          }
        ),
      };
    }

    return { allowed: true };
  } catch (err) {
    // Fail open
    console.error("[messageRateLimit] Unexpected error:", err);
    return { allowed: true };
  }
}
