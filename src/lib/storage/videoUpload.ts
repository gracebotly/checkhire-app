import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VIDEO_BUCKET = "video-applications";
const SIGNED_URL_EXPIRY_SECONDS = 900; // 15 minutes

/**
 * Generates the storage path for a video application file.
 * Format: {userId}/{applicationId}/q{questionIndex}.webm
 */
export function getVideoStoragePath(
  userId: string,
  applicationId: string,
  questionIndex: number
): string {
  return `${userId}/${applicationId}/q${questionIndex}.webm`;
}

/**
 * Generates a signed upload URL for a video application.
 * The candidate uploads directly to Supabase Storage via this URL.
 */
export async function generateVideoUploadUrl(
  userId: string,
  applicationId: string,
  questionIndex: number
): Promise<{ uploadUrl: string; storagePath: string } | null> {
  const path = getVideoStoragePath(userId, applicationId, questionIndex);

  const { data, error } = await supabaseAdmin.storage
    .from(VIDEO_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error("[videoUpload] Upload URL error:", error?.message);
    return null;
  }

  return {
    uploadUrl: data.signedUrl,
    storagePath: path,
  };
}

/**
 * Generates a signed playback URL for a video application (15-min expiry).
 * Used by employer-facing API routes.
 */
export async function generateVideoPlaybackUrl(
  storagePath: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[videoUpload] Playback URL error:", error?.message);
    return null;
  }

  return data.signedUrl;
}

/**
 * Deletes all video files for a given application.
 * Used during candidate withdrawal or data deletion.
 */
export async function deleteApplicationVideos(
  userId: string,
  applicationId: string
): Promise<void> {
  const prefix = `${userId}/${applicationId}/`;

  const { data: files } = await supabaseAdmin.storage
    .from(VIDEO_BUCKET)
    .list(prefix);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${prefix}${f.name}`);
    await supabaseAdmin.storage.from(VIDEO_BUCKET).remove(paths);
  }
}
