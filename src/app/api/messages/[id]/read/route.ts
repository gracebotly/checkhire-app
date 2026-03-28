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
 * PATCH /api/messages/[id]/read
 *
 * Marks a message as read by setting read_at to now().
 * Only the RECIPIENT can mark a message as read (not the sender).
 */
export const PATCH = withApiHandler(async function PATCH(
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

  // Fetch the message
  const { data: message } = await supabaseAdmin
    .from("messages")
    .select("id, application_id, sender_id, read_at")
    .eq("id", id)
    .maybeSingle();

  if (!message) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Message not found." },
      { status: 404 }
    );
  }

  // Already read? No-op
  if (message.read_at) {
    return NextResponse.json({ ok: true, already_read: true });
  }

  // Sender cannot mark their own message as read
  if (message.sender_id === user.id) {
    return NextResponse.json({ ok: true, already_read: true });
  }

  // Verify the caller is a party to this application
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, user_id, job_listing_id")
    .eq("id", message.application_id)
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

  // Mark as read
  const { error: updateError } = await supabaseAdmin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to mark as read." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
});
