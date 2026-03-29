import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH /api/admin/listings/[id]/moderate
 * Body: { action: 'approve' | 'reject' }
 */
export const PATCH = withApiHandler(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles").select("is_platform_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_platform_admin) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_ACTION", message: "Action must be 'approve' or 'reject'." },
      { status: 400 }
    );
  }

  const { data: listing } = await supabaseAdmin
    .from("job_listings").select("id, status").eq("id", id).single();

  if (!listing) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
  }

  if (listing.status !== "review_pending") {
    return NextResponse.json(
      { ok: false, code: "NOT_PENDING", message: "Listing is not pending review." },
      { status: 400 }
    );
  }

  const newStatus = action === "approve" ? "active" : "closed";
  const closeReason = action === "reject" ? "mlm_rejected" : null;

  const { error } = await supabaseAdmin
    .from("job_listings")
    .update({ status: newStatus, close_reason: closeReason })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, code: "UPDATE_FAILED", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: newStatus, action });
});
