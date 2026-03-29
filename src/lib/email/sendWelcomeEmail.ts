import { Resend } from "resend";

interface WelcomeEmailParams {
  to: string;
  userName?: string | null;
}

/**
 * Send a welcome email after signup.
 * Non-fatal: logs errors but never throws.
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[sendWelcomeEmail] RESEND_API_KEY not set — skipping");
    return;
  }

  const resend = new Resend(apiKey);
  const { to, userName } = params;
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  try {
    await resend.emails.send({
      from: "CheckHire <no-reply@checkhire.com>",
      to: [to],
      subject: "Welcome to CheckHire — Safe escrow for gig work",
      text: `${greeting}

Your account is ready. You can now create deals, fund escrow, and get paid safely for gig work.

CheckHire — You found each other. We make sure nobody gets screwed.`,
    });
    console.log(`[sendWelcomeEmail] Sent to ${to}`);
  } catch (err) {
    console.error("[sendWelcomeEmail] Failed:", err);
  }
}
