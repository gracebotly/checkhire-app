import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/messages/read-all
 *
 * Body: { application_id: UUID }
 *
 * Marks all unread messages in a conversation as read for the current user.
 * Only marks messages from the OTHER party (not your own messages).
 * Used when a user opens a chat thread.
 *
 * SECURITY AUDIT NOTE (2026-03-28): This endpoint verifies caller is either
 * the candidate on the application or an employer on the listing before marking
 * messages as read. Ownership check uses supabaseAdmin to bypass RLS for the
 * verification queries, then scopes the update to the verified application_id.
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
  const applicationId = body.application_id;

  if (!applicationId) {
    return NextResponse.json(
      { ok: false, code: "MISSING_PARAM", message: "application_id is required." },
      { status: 400 }
    );
  }

  // Verify access
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
      { ok: false, code: "NOT_AUTHORIZED", message: "Not authorized." },
      { status: 403 }
    );
  }

  // Mark all unread messages from the OTHER party as read
  // If I'm the candidate, mark employer + system messages as read
  // If I'm the employer, mark candidate + system messages as read
  const { error: updateError } = await supabaseAdmin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("application_id", applicationId)
    .is("read_at", null)
    .neq("sender_id", user.id);

  if (updateError) {
    console.error("[read-all] Update error:", updateError.message);
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to mark messages as read." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
});
