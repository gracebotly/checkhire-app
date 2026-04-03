import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { createServiceClient } from "@/lib/supabase/service";
import { adminUpdateScamCheckSchema } from "@/lib/validation/scam-check";
import { sendScamCheckVerdict } from "@/lib/email/scamCheckEmails";

export const PATCH = withApiHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await params;
  const body = await req.json();
  const parsed = adminUpdateScamCheckSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient();

  const updateData: Record<string, unknown> = { ...parsed.data };

  // Set verdict_at when a final verdict is given
  const finalStatuses = ["safe", "suspicious", "confirmed_scam"];
  if (parsed.data.status && finalStatuses.includes(parsed.data.status)) {
    updateData.verdict_at = new Date().toISOString();
    updateData.reviewer_user_id = adminCheck.userId;
  }

  const { data, error } = await serviceClient
    .from("scam_submissions")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: error.message },
      { status: 500 }
    );
  }

  // Send verdict email when a final status is set
  const finalVerdictStatuses = ["safe", "suspicious", "confirmed_scam"];
  if (
    parsed.data.status &&
    finalVerdictStatuses.includes(parsed.data.status) &&
    data.submitted_by_email &&
    data.verdict_summary
  ) {
    // Fire-and-forget verdict email
    sendScamCheckVerdict({
      to: data.submitted_by_email,
      submissionId: data.id,
      url: data.url,
      platform: data.platform,
      status: parsed.data.status as "safe" | "suspicious" | "confirmed_scam",
      verdictSummary: data.verdict_summary,
    });
  }

  return NextResponse.json({ ok: true, submission: data });
});

export const GET = withApiHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await params;
  const serviceClient = createServiceClient();

  const { data, error } = await serviceClient
    .from("scam_submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Submission not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, submission: data });
});
