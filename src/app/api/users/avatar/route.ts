import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export const POST = withApiHandler(async (req: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
      { status: 401 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, code: "NO_FILE", message: "No file provided" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_TYPE",
        message: "Only PNG, JPG, WebP, and GIF images are allowed",
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      {
        ok: false,
        code: "TOO_LARGE",
        message: "Image must be under 2MB",
      },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const storagePath = `${user.id}/avatar.${ext}`;
  const serviceClient = createServiceClient();

  const { data: existingFiles } = await serviceClient.storage
    .from("avatars")
    .list(user.id);

  if (existingFiles?.length) {
    const filesToDelete = existingFiles.map((existing) => `${user.id}/${existing.name}`);
    await serviceClient.storage.from("avatars").remove(filesToDelete);
  }

  const { error: uploadError } = await serviceClient.storage
    .from("avatars")
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { ok: false, code: "UPLOAD_ERROR", message: uploadError.message },
      { status: 500 },
    );
  }

  const { data: urlData } = serviceClient.storage
    .from("avatars")
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  const { error: profileError } = await serviceClient
    .from("user_profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (profileError) {
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: profileError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, avatar_url: publicUrl });
});

export const DELETE = withApiHandler(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
      { status: 401 },
    );
  }

  const serviceClient = createServiceClient();

  const { data: existingFiles } = await serviceClient.storage
    .from("avatars")
    .list(user.id);

  if (existingFiles?.length) {
    const filesToDelete = existingFiles.map((existing) => `${user.id}/${existing.name}`);
    await serviceClient.storage.from("avatars").remove(filesToDelete);
  }

  await serviceClient
    .from("user_profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
});
