import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { logCandidateAccess } from "@/lib/api/auditLog";
import { checkCandidateViewRateLimit } from "@/lib/api/rateLimitCandidateViews";
import { generateVideoPlaybackUrl } from "@/lib/storage/videoUpload";
import type { VideoResponse } from "@/types/database";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/employer/applications/[id]/video
 *
 * Returns signed, 15-minute expiring playback URLs for all video responses
 * on this application. Available at any disclosure level (video shows face
 * but not name — part of the DEI-friendly blind screening design).
 * Rate limited and audit logged.
 */
export const GET = withApiHandler(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getEmployerForUser();
  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  // Rate limit
  const rl = await checkCandidateViewRateLimit(ctx.employerId, req);
  if (!rl.allowed) return rl.response;

  // Fetch application
  const { data: application } = await supabaseAdmin
    .from("applications")
    .select("id, user_id, job_listing_id, video_responses")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json(
      { ok: false, code: "NOT_FOUND", message: "Application not found." },
      { status: 404 }
    );
  }

  // Verify listing belongs to employer
  const { data: listing } = await supabaseAdmin
    .from("job_listings")
    .select("id, employer_id, video_questions")
    .eq("id", application.job_listing_id)
    .eq("employer_id", ctx.employerId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json(
      { ok: false, code: "NOT_AUTHORIZED", message: "This application is not on your listing." },
      { status: 403 }
    );
  }

  const videoResponses: VideoResponse[] = application.video_responses || [];

  if (videoResponses.length === 0) {
    return NextResponse.json({
      ok: true,
      videos: [],
      message: "No video responses submitted for this application.",
    });
  }

  // Generate signed playback URLs for each video
  const videos = await Promise.all(
    videoResponses.map(async (vr) => {
      // Extract storage path from the video_url
      // video_url is stored as the storage path (e.g., "userId/appId/q0.webm")
      const playbackUrl = await generateVideoPlaybackUrl(vr.video_url);
      const question = (listing.video_questions as { prompt: string }[])?.[vr.question_index];

      return {
        question_index: vr.question_index,
        prompt: question?.prompt || `Question ${vr.question_index + 1}`,
        playback_url: playbackUrl,
        recorded_at: vr.recorded_at,
      };
    })
  );

  // Log access
  await logCandidateAccess(
    ctx.employerId,
    ctx.userId,
    "candidate_view",
    application.id,
    1, // Videos are viewable at Stage 1
    req
  );

  return NextResponse.json({ ok: true, videos });
});
