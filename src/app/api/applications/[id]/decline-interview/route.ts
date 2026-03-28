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
 * POST /api/applications/[id]/decline-interview
 *
 * Candidate declines an interview request.
 * - Validates current status is 'interview_requested'
 * - Sets status to 'rejected' (candidate-initiated)
 * - Does NOT advance disclosure_level
 * - Creates system message
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

  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, user_id, status")
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
        message: `Cannot decline interview from status "${application.status}".`,
      },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("applications")
    .update({ status: "rejected" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to decline interview." },
      { status: 500 }
    );
  }

  await createSystemMessage(
    id,
    "The candidate has declined the interview request.",
    "interview_response",
    { action: "declined" }
  );

  return NextResponse.json({ ok: true, status: "rejected" });
});
