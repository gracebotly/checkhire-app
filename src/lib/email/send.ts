import { Resend } from "resend";

const FROM = "CheckHire <no-reply@checkhire.co>";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email via Resend. Non-fatal: logs errors but never throws.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendEmail({ to, subject, html, from }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[sendEmail] RESEND_API_KEY not set — skipping");
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: from || FROM,
      to: [to],
      subject,
      html,
      headers: {
        'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_APP_URL || 'https://checkhire.co'}/settings>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    return true;
  } catch (err) {
    console.error(`[sendEmail] Failed to send "${subject}" to ${to}:`, err);
    return false;
  }
}
