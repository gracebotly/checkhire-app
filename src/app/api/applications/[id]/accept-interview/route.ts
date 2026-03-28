import { withApiHandler } from "@/lib/api/withApiHandler";
import { createSystemMessage } from "@/lib/chat/systemMessage";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/applications/[id]/accept-interview
 *
 * Candidate accepts an interview request.
 * - Validates current status is 'interview_requested'
 * - Sets status to 'interview_accepted'
 * - Advances disclosure_level to 2
 * - Sets disclosed_at_stage2 timestamp
 * - Creates system message: "Interview accepted. First name is now visible to the employer."
 */
export const POST = withApiHandler(async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Fetch application — candidate must own it
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, user_id, status, disclosure_level, job_listing_id, pseudonym")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  if (application.user_id !== user.id) {
    return NextResponse.json(
      { ok: false, code: "NOT_AUTHORIZED", message: "This is not your application." },
      { status: 403 }
    );
  }

  if (application.status !== "interview_requested") {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_STATUS",
        message: `Cannot accept interview from status "${application.status}". Must be "interview_requested".`,
      },
      { status: 400 }
    );
  }

  // Advance status + disclosure level
  const { error: updateError } = await supabaseAdmin
    .from("applications")
    .update({
      status: "interview_accepted",
      disclosure_level: 2,
      disclosed_at_stage2: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("[accept-interview] Update error:", updateError.message);
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to accept interview." },
      { status: 500 }
    );
  }

  // Create system message
  await createSystemMessage(
    id,
    "Interview accepted. Your first name is now visible to the employer.",
    "interview_response",
    { action: "accepted", disclosure_level: 2 }
  );

  return NextResponse.json({
    ok: true,
    status: "interview_accepted",
    disclosure_level: 2,
  });
});
