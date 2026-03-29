import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VIDEO_BUCKET = "video-applications";
const RETENTION_DAYS = 90;

/**
 * Cleans up video application files for listings that closed more than
 * RETENTION_DAYS (90) days ago.
 *
 * Per the data retention policy:
 * - Applicant video submissions are deleted 90 days after listing closes
 * - Raw resume PDFs are deleted 90 days after listing closes or on candidate request
 *
 * This function is intended to run as a scheduled job (Vercel Cron or
 * Supabase pg_cron). For MVP, it can be triggered manually via an admin endpoint.
 *
 * @returns Summary of cleanup: listings processed and videos deleted
 */
export async function cleanupExpiredVideos(): Promise<{
  listings_processed: number;
  videos_deleted: number;
  errors: string[];
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

  const errors: string[] = [];
  let videosDeleted = 0;

  // Find listings that closed/filled/expired more than 90 days ago
  const { data: expiredListings, error: listingError } = await supabaseAdmin
    .from("job_listings")
    .select("id")
    .in("status", ["closed", "filled", "expired"])
    .lt("updated_at", cutoffDate.toISOString());

  if (listingError) {
    return { listings_processed: 0, videos_deleted: 0, errors: [listingError.message] };
  }

  if (!expiredListings || expiredListings.length === 0) {
    return { listings_processed: 0, videos_deleted: 0, errors: [] };
  }

  const listingIds = expiredListings.map((l) => l.id);

  // Find applications with video_responses on these listings
  const { data: applications } = await supabaseAdmin
    .from("applications")
    .select("id, user_id, video_responses")
    .in("job_listing_id", listingIds)
    .not("video_responses", "eq", "[]");

  if (!applications || applications.length === 0) {
    return { listings_processed: listingIds.length, videos_deleted: 0, errors: [] };
  }

  for (const app of applications) {
    const videoResponses = app.video_responses as { video_url: string }[] | null;

    if (!videoResponses || videoResponses.length === 0) continue;

    // Collect all video file paths
    const filePaths = videoResponses
      .map((vr) => vr.video_url)
      .filter(Boolean);

    if (filePaths.length > 0) {
      // Delete video files from storage
      const { error: deleteError } = await supabaseAdmin.storage
        .from(VIDEO_BUCKET)
        .remove(filePaths);

      if (deleteError) {
        errors.push(`App ${app.id}: ${deleteError.message}`);
      } else {
        videosDeleted += filePaths.length;
      }
    }

    // Clear video_responses on the application record
    try {
      await supabaseAdmin
        .from("applications")
        .update({ video_responses: [] })
        .eq("id", app.id);
    } catch (err) {
      errors.push(`App ${app.id} update: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return {
    listings_processed: listingIds.length,
    videos_deleted: videosDeleted,
    errors,
  };
}
