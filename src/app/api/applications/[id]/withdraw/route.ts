import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createSystemMessage } from "@/lib/chat/systemMessage";
import { deactivateMaskedPair } from "@/lib/email/maskedEmail";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TERMINAL_STATUSES = ["withdrawn", "rejected", "hired"];

/**
 * POST /api/applications/[id]/withdraw
 *
 * Candidate withdraws their own application.
 * - Sets status to 'withdrawn', withdrawn_at to now
 * - Creates system message
 * - Deactivates masked email pair if one exists
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
    .select("id, user_id, status, job_listing_id")
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

  if (TERMINAL_STATUSES.includes(application.status)) {
    return NextResponse.json(
      {
        ok: false,
        code: "ALREADY_TERMINAL",
        message: `Cannot withdraw — application is already "${application.status}".`,
      },
      { status: 400 }
    );
  }

  // Update status
  const { error: updateError } = await supabaseAdmin
    .from("applications")
    .update({
      status: "withdrawn",
      withdrawn_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    console.error("[withdraw] Update error:", updateError.message);
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to withdraw application." },
      { status: 500 }
    );
  }

  // Create system message
  await createSystemMessage(
    id,
    "Candidate has withdrawn their application.",
    "status_change",
    { action: "withdrawn" }
  ).catch(() => {});

  // Deactivate masked email pair if exists (non-blocking)
  deactivateMaskedPair(id).catch(() => {});

  return NextResponse.json({
    ok: true,
    status: "withdrawn",
  });
});
