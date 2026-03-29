import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { recalculateScore } from "@/lib/employer/recalculateScore";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH /api/admin/flags/[id]
 * Body: { status: 'resolved'|'dismissed'|'investigating', resolution_notes?: string }
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
  const newStatus = body.status as string;
  const resolutionNotes = (body.resolution_notes ?? "").toString().trim() || null;

  if (!["resolved", "dismissed", "investigating"].includes(newStatus)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_STATUS", message: "Status must be resolved, dismissed, or investigating." },
      { status: 400 }
    );
  }

  const { data: flag } = await supabaseAdmin
    .from("flags").select("id, target_type, target_id, status").eq("id", id).single();

  if (!flag) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
  }

  const update: Record<string, unknown> = { status: newStatus };
  if (resolutionNotes) update.resolution_notes = resolutionNotes;
  if (["resolved", "dismissed"].includes(newStatus)) {
    update.resolved_at = new Date().toISOString();
    update.resolved_by = user.id;
  }

  const { error } = await supabaseAdmin.from("flags").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, code: "UPDATE_FAILED", message: error.message }, { status: 500 });
  }

  if (flag.target_type === "employer") {
    recalculateScore(flag.target_id).catch(() => {});
  }

  return NextResponse.json({ ok: true, status: newStatus });
});
