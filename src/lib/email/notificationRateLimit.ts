import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Checks whether an email notification was already sent for this
 * application thread within the last hour. Prevents notification spam.
 *
 * Uses a simple approach: check the messages table for a system message
 * tagged with the matching notification_type in metadata.
 *
 * Returns true if a notification can be sent (no recent notification).
 * Returns false if a notification was sent within the last hour.
 */
export async function canSendNotification(
  applicationId: string,
  notificationType: string
): Promise<boolean> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Check for a recent notification of the SAME type (tagged with metadata)
    const { data: taggedNotifications } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("application_id", applicationId)
      .eq("sender_type", "system")
      .gte("created_at", oneHourAgo)
      .contains("metadata", { notification_type: notificationType })
      .limit(1);

    if (taggedNotifications && taggedNotifications.length > 0) {
      return false;
    }

    return true;
  } catch (err) {
    // Fail open — if we can't check, send the notification anyway
    console.error("[notificationRateLimit] Check failed:", err);
    return true;
  }
}
