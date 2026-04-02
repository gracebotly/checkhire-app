import { sendEmail } from "./send";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://checkhire.co";

/**
 * Notify the platform admin (founder) about an event that needs attention.
 * Non-fatal: logs errors but never throws.
 */
export async function notifyAdmin(params: {
  subject: string;
  body: string;
  dealSlug?: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn("[notifyAdmin] ADMIN_EMAIL not set — skipping admin notification");
    return;
  }

  const ctaHtml = params.dealSlug
    ? `<a href="${APP_URL}/deal/${params.dealSlug}" style="display: inline-block; background: #0d9488; color: #fff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px;">View Deal</a>`
    : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      ${params.body}
      ${ctaHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #64748b;">
        CheckHire Admin Alert
      </p>
    </div>
  `;

  await sendEmail({ to: adminEmail, subject: params.subject, html });
}
