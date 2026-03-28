import { NextResponse } from "next/server";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const BUCKET = "logos";

/**
 * POST /api/employer/branding/logo — Upload a company logo.
 * Accepts multipart/form-data with a "file" field.
 */
export const POST = withApiHandler(async function POST(req: Request) {
  const ctx = await getEmployerForUser();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { ok: false, code: "NO_FILE", message: "No file provided." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_TYPE", message: "File must be PNG, JPG, SVG, or WebP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { ok: false, code: "FILE_TOO_LARGE", message: "File must be under 2MB." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Generate unique filename
  const ext = file.name.split(".").pop() || "png";
  const fileName = `${ctx.employerId}/${Date.now()}.${ext}`;

  // Upload to Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("[api/employer/branding/logo] Upload error:", uploadError.message);
    return NextResponse.json(
      { ok: false, code: "UPLOAD_FAILED", message: "Failed to upload logo." },
      { status: 500 }
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  const logoUrl = urlData.publicUrl;

  // Update employer record
  const { error: updateError } = await supabase
    .from("employers")
    .update({ logo_url: logoUrl })
    .eq("id", ctx.employerId);

  if (updateError) {
    console.error("[api/employer/branding/logo] DB update error:", updateError.message);
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Logo uploaded but failed to save URL." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, logo_url: logoUrl });
});

/**
 * DELETE /api/employer/branding/logo — Remove the company logo.
 */
export const DELETE = withApiHandler(async function DELETE() {
  const ctx = await getEmployerForUser();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  const supabase = await createClient();

  // Remove logo_url from employer record
  const { error } = await supabase
    .from("employers")
    .update({ logo_url: null })
    .eq("id", ctx.employerId);

  if (error) {
    console.error("[api/employer/branding/logo] Delete error:", error.message);
    return NextResponse.json(
      { ok: false, code: "DELETE_FAILED", message: "Failed to remove logo." },
      { status: 500 }
    );
  }

  // Note: We don't delete from Supabase Storage here — orphaned files
  // can be cleaned up in a background job later. This avoids the complexity
  // of parsing the storage path from the public URL.

  return NextResponse.json({ ok: true });
});
