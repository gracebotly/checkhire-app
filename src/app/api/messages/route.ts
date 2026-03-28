import { withApiHandler } from "@/lib/api/withApiHandler";
import { logCandidateAccess } from "@/lib/api/auditLog";
import { detectPiiRequests } from "@/lib/chat/piiDetection";
import { checkMessageThreadRateLimit } from "@/lib/chat/messageRateLimit";
import { sendMessageSchema } from "@/lib/validation/messageSchema";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/messages?application_id=UUID&cursor=TIMESTAMP&limit=50
 *
 * Returns paginated messages for an application.
 * The caller must be either the candidate on the application or an employer
 * on the listing. RLS enforces this at the DB level, but we also check
 * explicitly for clear error messages.
 *
 * Messages are returned newest-first (DESC). Use `cursor` for pagination
 * (pass `created_at` of the last message to get older ones).
 */
export const GET = withApiHandler(async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const applicationId = searchParams.get("application_id");
  const cursor = searchParams.get("cursor"); // ISO timestamp for pagination
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 50);

  if (!applicationId) {
    return NextResponse.json(
      { ok: false, code: "MISSING_PARAM", message: "application_id is required." },
      { status: 400 }
    );
  }

  // Verify access: caller must be candidate or employer on this application
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, user_id, job_listing_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  const isCandidate = application.user_id === user.id;

  let isEmployer = false;
  if (!isCandidate) {
    const { data: listing } = await supabaseAdmin
      .from("job_listings")
      .select("id, employer_id")
      .eq("id", application.job_listing_id)
      .maybeSingle();

    if (listing) {
      const { data: employerUser } = await supabaseAdmin
        .from("employer_users")
        .select("id")
        .eq("employer_id", listing.employer_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (employerUser) isEmployer = true;
    }
  }

  if (!isCandidate && !isEmployer) {
    return NextResponse.json(
      { ok: false, code: "NOT_AUTHORIZED", message: "You are not a party to this application." },
      { status: 403 }
    );
  }

  // Fetch messages (newest first, paginated)
  let query = supabaseAdmin
    .from("messages")
    .select("id, application_id, sender_id, sender_type, message_text, message_type, metadata, read_at, created_at")
    .eq("application_id", applicationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: messages, error } = await query;

  if (error) {
    console.error("[api/messages] Query error:", error.message);
    return NextResponse.json(
      { ok: false, code: "QUERY_FAILED", message: "Failed to load messages." },
      { status: 500 }
    );
  }

  // Determine if there are more messages
  const hasMore = (messages || []).length === limit;

  // Return messages in chronological order for the UI (reverse the DESC query)
  const sorted = (messages || []).reverse();

  return NextResponse.json({
    ok: true,
    messages: sorted,
    has_more: hasMore,
    cursor: sorted.length > 0 ? sorted[0].created_at : null,
  });
});

/**
 * POST /api/messages
 *
 * Body: { application_id: UUID, message_text: string }
 *
 * Sends a message in a chat thread. Validates:
 * - Caller is candidate or employer on the application
 * - Application is not in a terminal state (rejected, hired)
 * - PII detection scan (soft warning, message still sends)
 * - Rate limit for employers (20 new threads/day)
 * - Audit logging for employer messages
 */
export const POST = withApiHandler(async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = sendMessageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Invalid message.",
      },
      { status: 400 }
    );
  }

  const { application_id, message_text } = parsed.data;

  // Fetch application to verify access
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, user_id, job_listing_id, status, disclosure_level")
    .eq("id", application_id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  // Check if application is in a terminal state
  if (["rejected", "hired"].includes(application.status)) {
    return NextResponse.json(
      {
        ok: false,
        code: "THREAD_CLOSED",
        message: "This conversation is closed. The application has been finalized.",
      },
      { status: 400 }
    );
  }

  // Determine sender type
  const isCandidate = application.user_id === user.id;
  let isEmployer = false;
  let employerContext: { employerId: string; userId: string } | null = null;

  if (!isCandidate) {
    const { data: listing } = await supabaseAdmin
      .from("job_listings")
      .select("id, employer_id")
      .eq("id", application.job_listing_id)
      .maybeSingle();

    if (listing) {
      const { data: employerUser } = await supabaseAdmin
        .from("employer_users")
        .select("id, employer_id")
        .eq("employer_id", listing.employer_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (employerUser) {
        isEmployer = true;
        employerContext = {
          employerId: listing.employer_id,
          userId: user.id,
        };
      }
    }
  }

  if (!isCandidate && !isEmployer) {
    return NextResponse.json(
      { ok: false, code: "NOT_AUTHORIZED", message: "You are not a party to this application." },
      { status: 403 }
    );
  }

  const senderType = isCandidate ? "candidate" : "employer";

  // Rate limit for employers — 20 new threads per day
  if (isEmployer) {
    const rl = await checkMessageThreadRateLimit(user.id, application_id);
    if (!rl.allowed) return rl.response;
  }

  // PII detection (soft warning — message still sends)
  const piiResult = detectPiiRequests(message_text);

  // Insert the message
  const { data: message, error: insertError } = await supabaseAdmin
    .from("messages")
    .insert({
      application_id,
      sender_id: user.id,
      sender_type: senderType,
      message_text,
      message_type: "text",
      metadata: piiResult.flagged ? { pii_flagged: true, pii_warnings: piiResult.warnings } : null,
    })
    .select("id, application_id, sender_id, sender_type, message_text, message_type, metadata, read_at, created_at")
    .single();

  if (insertError) {
    console.error("[api/messages] Insert error:", insertError.message);
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: "Failed to send message." },
      { status: 500 }
    );
  }

  // Audit log for employer messages (anti-harvesting Layer 6)
  if (isEmployer && employerContext) {
    await logCandidateAccess(
      employerContext.employerId,
      employerContext.userId,
      "message_sent",
      application_id,
      application.disclosure_level,
      req
    );
  }

  return NextResponse.json({
    ok: true,
    message,
    pii_warning: piiResult.flagged ? piiResult.warnings[0] : null,
  });
});
