import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { verifyGuestToken } from "@/lib/deals/guestToken";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
]);

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const formData = await req.formData();

    const guestToken = formData.get("guest_token") as string | null;
    if (!guestToken) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Guest token required" },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Fetch deal to get guest email
    const { data: deal } = await supabase
      .from("deals")
      .select("id, guest_freelancer_email")
      .eq("id", id)
      .maybeSingle();

    if (!deal || !deal.guest_freelancer_email) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    // Verify guest token
    if (!verifyGuestToken(guestToken, id, deal.guest_freelancer_email)) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "File too large. Maximum 10MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "File type not allowed. Accepted: images, PDF, Word, text, ZIP." },
        { status: 400 }
      );
    }

    // Read is_submission_evidence from form data (default false)
    const isSubmissionEvidence = formData.get("is_submission_evidence") === "true";

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `deals/${id}/${timestamp}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("deal-files")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { ok: false, code: "UPLOAD_ERROR", message: uploadError.message },
        { status: 500 }
      );
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from("deal-files")
      .createSignedUrl(storagePath, 60 * 15);

    const { data: entry, error: logError } = await supabase
      .from("deal_activity_log")
      .insert({
        deal_id: id,
        user_id: null,
        entry_type: "file",
        file_url: storagePath,
        file_name: file.name,
        file_size_bytes: file.size,
        is_submission_evidence: isSubmissionEvidence,
        criteria_id: (formData.get("criteria_id") as string) || null,
      })
      .select()
      .single();

    if (logError) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: logError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, entry: { ...entry, file_url: urlData?.signedUrl || "" } });
  }
);
