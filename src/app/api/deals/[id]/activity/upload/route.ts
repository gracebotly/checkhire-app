import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
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
  async (
    req: Request,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );

    // Verify participant
    const { data: deal } = await supabase
      .from("deals")
      .select("client_user_id, freelancer_user_id")
      .eq("id", id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    if (
      deal.client_user_id !== user.id &&
      deal.freelancer_user_id !== user.id
    ) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Not a participant" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "File too large. Maximum 20MB.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "File type not allowed",
        },
        { status: 400 }
      );
    }

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

    // Get URL (signed since bucket is private)
    const { data: urlData } = await supabase.storage
      .from("deal-files")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

    const fileUrl = urlData?.signedUrl || "";

    const { data: entry, error: logError } = await supabase
      .from("deal_activity_log")
      .insert({
        deal_id: id,
        user_id: user.id,
        entry_type: "file",
        file_url: fileUrl,
        file_name: file.name,
        file_size_bytes: file.size,
      })
      .select()
      .single();

    if (logError) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: logError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, entry });
  }
);
