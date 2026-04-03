import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/api/withApiHandler";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
];

export const POST = withApiHandler(
  async (
    req: Request,
    { params }: { params: Promise<{ id: string; iid: string }> }
  ) => {
    const { id, iid } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: interest } = await supabase
      .from("deal_interest")
      .select("id, deal_id, user_id, status")
      .eq("id", iid)
      .eq("deal_id", id)
      .maybeSingle();

    if (!interest) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Thread not found" },
        { status: 404 }
      );
    }

    if (interest.status === "rejected" || interest.status === "withdrawn") {
      return NextResponse.json(
        {
          ok: false,
          code: "THREAD_CLOSED",
          message: "This conversation is closed",
        },
        { status: 400 }
      );
    }

    const { data: deal } = await supabase
      .from("deals")
      .select("client_user_id")
      .eq("id", id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );
    }

    const isApplicant = interest.user_id === user.id;
    const isClient = deal.client_user_id === user.id;
    if (!isApplicant && !isClient) {
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "Not a thread participant" },
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

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "File too large. Maximum 20MB.",
        },
        { status: 400 }
      );
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "File type not accepted",
        },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "bin";
    const storagePath = `${id}/threads/${iid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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

    const { data: entry, error: insertError } = await supabase
      .from("deal_activity_log")
      .insert({
        deal_id: id,
        user_id: user.id,
        interest_id: iid,
        entry_type: "file",
        file_url: storagePath,
        file_name: file.name,
        file_size_bytes: file.size,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, entry });
  }
);
