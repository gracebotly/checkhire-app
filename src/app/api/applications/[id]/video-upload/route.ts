import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { generateVideoUploadUrl } from "@/lib/storage/videoUpload";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/applications/[id]/video-upload
 *
 * Returns a signed upload URL for the candidate to upload a video response.
 * Body: { question_index: number }
 */
export const POST = withApiHandler(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated." },
      { status: 401 }
    );
  }

  // Verify application belongs to this user
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const questionIndex = body.question_index;

  if (typeof questionIndex !== "number" || questionIndex < 0 || questionIndex > 4) {
    return NextResponse.json(
      { ok: false, code: "INVALID_INDEX", message: "Invalid question_index (0-4)." },
      { status: 400 }
    );
  }

  const result = await generateVideoUploadUrl(user.id, id, questionIndex);

  if (!result) {
    return NextResponse.json(
      { ok: false, code: "UPLOAD_FAILED", message: "Failed to generate upload URL." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    upload_url: result.uploadUrl,
    storage_path: result.storagePath,
  });
});

/**
 * PATCH /api/applications/[id]/video-upload
 *
 * Updates the application's video_responses JSON after videos have been uploaded.
 * Body: { video_responses: VideoResponse[] }
 */
export const PATCH = withApiHandler(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated." },
      { status: 401 }
    );
  }

  // Verify application belongs to this user
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const videoResponses = body.video_responses;

  if (!Array.isArray(videoResponses)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_BODY", message: "video_responses array required." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("applications")
    .update({ video_responses: videoResponses })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { ok: false, code: "UPDATE_FAILED", message: "Failed to save video responses." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
});
