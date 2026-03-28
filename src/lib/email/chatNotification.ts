import { Resend } from "resend";

interface ChatNotificationParams {
  to: string;
  recipientName: string | null;
  listingTitle: string;
  senderLabel: string; // "an employer" or company name for seekers, pseudonym/name for employers
  applicationId: string;
  baseUrl?: string;
}

/**
 * Sends a content-free chat notification email.
 *
 * IMPORTANT: The email does NOT include the message content.
 * It only tells the recipient they have a new message and
 * links them back to the app. This is by design — all
 * communication stays on-platform.
 *
 * Rate limit: called at most once per thread per hour.
 * The caller is responsible for checking the rate limit
 * before calling this function.
 *
 * Non-fatal: logs errors but never throws.
 */
export async function sendChatNotification(params: ChatNotificationParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[chatNotification] RESEND_API_KEY not set — skipping");
    return;
  }

  const resend = new Resend(apiKey);
  const { to, recipientName, listingTitle, senderLabel, applicationId, baseUrl } = params;

  const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,";
  const appUrl = `${baseUrl || "https://checkhire.com"}/seeker/messages/${applicationId}`;

  const subject = `New message about: ${listingTitle}`;
  const body = `${greeting}

You have a new message from ${senderLabel} regarding your application for "${listingTitle}".

View the conversation on CheckHire:
${appUrl}

For your protection, message content is not included in this email — all communication stays on-platform.

— CheckHire`;

  try {
    await resend.emails.send({
      from: "CheckHire <no-reply@checkhire.com>",
      to: [to],
      subject,
      text: body,
    });
    console.log(`[chatNotification] Sent to ${to} for application ${applicationId}`);
  } catch (err) {
    console.error("[chatNotification] Failed:", err);
  }
}
