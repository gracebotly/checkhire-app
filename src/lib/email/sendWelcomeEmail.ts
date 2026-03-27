import { Resend } from "resend";

interface WelcomeEmailParams {
  to: string;
  userName?: string | null;
  userType: "employer" | "job_seeker";
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
  const { to, userName, userType } = params;
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  const isEmployer = userType === "employer";
  const subject = isEmployer
    ? "Welcome to CheckHire — Start posting verified jobs"
    : "Welcome to CheckHire — Find trusted jobs";

  const body = isEmployer
    ? `${greeting}

Your employer account is ready. You can now create your company profile and start posting verified job listings.

CheckHire — The trust-first job board.`
    : `${greeting}

Your account is ready. Browse verified job listings and apply with confidence — your identity stays protected until you choose to share it.

CheckHire — The trust-first job board.`;

  try {
    await resend.emails.send({
      from: "CheckHire <no-reply@checkhire.com>",
      to: [to],
      subject,
      text: body,
    });
    console.log(`[sendWelcomeEmail] Sent to ${to} (${userType})`);
  } catch (err) {
    console.error("[sendWelcomeEmail] Failed:", err);
  }
}
