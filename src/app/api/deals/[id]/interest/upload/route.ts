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
    const { id: dealId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );

    const { data: deal } = await supabase
      .from("deals")
      .select("id, deal_type, status, client_user_id, freelancer_user_id")
      .eq("id", dealId)
      .maybeSingle();

    if (!deal)
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );

    if (deal.client_user_id === user.id)
      return NextResponse.json(
        {
          ok: false,
          code: "FORBIDDEN",
          message: "Cannot upload to your own gig",
        },
        { status: 403 }
      );

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const interestId = formData.get("interest_id") as string | null;

    if (!file)
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "No file provided" },
        { status: 400 }
      );

    if (file.size > MAX_SIZE)
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "File too large. Maximum 20MB.",
        },
        { status: 400 }
      );

    if (!ALLOWED_TYPES.has(file.type))
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "File type not allowed",
        },
        { status: 400 }
      );

    if (interestId) {
      const { data: interest } = await supabase
        .from("deal_interest")
        .select("id, user_id")
        .eq("id", interestId)
        .eq("deal_id", dealId)
        .maybeSingle();

      if (!interest || interest.user_id !== user.id)
        return NextResponse.json(
          { ok: false, code: "FORBIDDEN", message: "Not your application" },
          { status: 403 }
        );

      const { count } = await supabase
        .from("application_files")
        .select("id", { count: "exact", head: true })
        .eq("interest_id", interestId);

      if ((count || 0) >= 3)
        return NextResponse.json(
          {
            ok: false,
            code: "LIMIT_REACHED",
            message: "Maximum 3 files per application",
          },
          { status: 400 }
        );
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const folder = interestId
      ? `applications/${interestId}`
      : "applications/pending";
    const storagePath = `deals/${dealId}/${folder}/${timestamp}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("deal-files")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError)
      return NextResponse.json(
        { ok: false, code: "UPLOAD_ERROR", message: uploadError.message },
        { status: 500 }
      );

    const { data: urlData } = await supabase.storage
      .from("deal-files")
      .createSignedUrl(storagePath, 60 * 15);

    if (interestId) {
      const { error: insertError } = await supabase
        .from("application_files")
        .insert({
          interest_id: interestId,
          deal_id: dealId,
          user_id: user.id,
          file_url: storagePath,
          file_name: file.name,
          file_size_bytes: file.size,
        });

      if (insertError)
        return NextResponse.json(
          { ok: false, code: "DB_ERROR", message: insertError.message },
          { status: 500 }
        );
    }

    return NextResponse.json({
      ok: true,
      file: {
        file_url: storagePath,
        signed_url: urlData?.signedUrl || "",
        file_name: file.name,
        file_size_bytes: file.size,
      },
    });
  }
);
