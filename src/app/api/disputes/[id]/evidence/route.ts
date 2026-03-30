import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
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

    const serviceClient = createServiceClient();

    // Fetch dispute and verify access
    const { data: dispute } = await serviceClient
      .from("disputes")
      .select("*, deal:deals!inner(client_user_id, freelancer_user_id)")
      .eq("id", id)
      .maybeSingle();

    if (!dispute)
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Dispute not found" },
        { status: 404 }
      );

    const deal = dispute.deal as {
      client_user_id: string;
      freelancer_user_id: string | null;
    };
    if (
      deal.client_user_id !== user.id &&
      deal.freelancer_user_id !== user.id
    )
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Not a deal participant" },
        { status: 403 }
      );

    // Dispute must still be open or under review
    if (!["open", "under_review"].includes(dispute.status))
      return NextResponse.json(
        {
          ok: false,
          code: "DISPUTE_CLOSED",
          message: "This dispute is no longer accepting evidence",
        },
        { status: 400 }
      );

    // Parse multipart form data
    const formData = await req.formData();
    const evidenceType = formData.get("evidence_type") as string;
    const description = (formData.get("description") as string) || null;

    if (
      !evidenceType ||
      !["screenshot", "file", "video", "text", "link"].includes(evidenceType)
    )
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Invalid evidence type" },
        { status: 400 }
      );

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSizeBytes: number | null = null;

    if (["screenshot", "file", "video"].includes(evidenceType)) {
      const file = formData.get("file") as File | null;
      if (!file)
        return NextResponse.json(
          { ok: false, code: "VALIDATION_ERROR", message: "File is required for this evidence type" },
          { status: 400 }
        );

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024)
        return NextResponse.json(
          { ok: false, code: "FILE_TOO_LARGE", message: "File must be under 50MB" },
          { status: 400 }
        );

      fileName = file.name;
      fileSizeBytes = file.size;

      // Upload to Supabase Storage
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `disputes/${id}/${timestamp}-${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await serviceClient.storage
        .from("dispute-evidence")
        .upload(storagePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError)
        return NextResponse.json(
          { ok: false, code: "UPLOAD_ERROR", message: uploadError.message },
          { status: 500 }
        );

      fileUrl = storagePath;
    }

    // For text evidence
    let content: string | null = null;
    if (evidenceType === "text") {
      content = formData.get("content") as string;
      if (!content || content.length === 0)
        return NextResponse.json(
          { ok: false, code: "VALIDATION_ERROR", message: "Text content is required" },
          { status: 400 }
        );
      if (content.length > 2000)
        return NextResponse.json(
          { ok: false, code: "VALIDATION_ERROR", message: "Text too long (max 2000 characters)" },
          { status: 400 }
        );
    }

    // For link evidence
    if (evidenceType === "link") {
      const url = formData.get("url") as string;
      if (!url)
        return NextResponse.json(
          { ok: false, code: "VALIDATION_ERROR", message: "URL is required" },
          { status: 400 }
        );
      // Store URL in file_url field
      fileUrl = url;
    }

    // Insert evidence record
    const { data: evidence, error: insertError } = await serviceClient
      .from("dispute_evidence")
      .insert({
        dispute_id: id,
        submitted_by: user.id,
        evidence_type: evidenceType,
        file_url: fileUrl,
        file_name: fileName,
        file_size_bytes: fileSizeBytes,
        description: description || content,
      })
      .select()
      .single();

    if (insertError)
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: insertError.message },
        { status: 500 }
      );

    return NextResponse.json({ ok: true, evidence });
  }
);
