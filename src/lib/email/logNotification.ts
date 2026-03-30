import { sendDealNotification } from "./notifications";
import type { NotificationData } from "./notifications";
import type { NotificationType } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Send a deal notification email and log it to email_notifications.
 * @param params.supabase — MUST be the service client (createServiceClient) to bypass RLS
 */
export async function sendAndLogNotification(params: {
  supabase: SupabaseClient;
  type: NotificationType;
  userId: string;
  dealId: string;
  email: string;
  data: NotificationData;
}): Promise<void> {
  const { supabase, type, userId, dealId, email, data } = params;

  const sent = await sendDealNotification({ type, to: email, data });

  await supabase.from("email_notifications").insert({
    user_id: userId,
    deal_id: dealId,
    notification_type: type,
    email_address: email,
    sent_at: sent ? new Date().toISOString() : null,
  });
}
