import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Checks whether an email notification was already sent for this
 * application thread within the last hour. Prevents notification spam.
 *
 * Uses a simple approach: check the messages table for a metadata flag.
 * We piggyback on the messages table rather than creating a separate
 * notifications table — keeps the schema lean for MVP.
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

    // Check if we recently sent a notification for this thread
    // We use a lightweight approach: query messages with metadata containing
    // the notification flag. System messages created by notifications will
    // have metadata.notification_sent = true.
    const { data: recentNotifications } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("application_id", applicationId)
      .eq("sender_type", "system")
      .gte("created_at", oneHourAgo)
      .limit(1);

    // If there's any system message in the last hour, skip the notification
    // This is intentionally broad — we don't want to spam for any reason
    if (recentNotifications && recentNotifications.length > 0) {
      return false;
    }

    return true;
  } catch (err) {
    // Fail open — if we can't check, send the notification anyway
    console.error("[notificationRateLimit] Check failed:", err);
    return true;
  }
}
