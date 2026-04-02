import { Resend } from "resend";

interface WelcomeEmailParams {
  to: string;
  userName?: string | null;
}

/**
 * Send a branded welcome email after signup.
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://checkhire.co";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to CheckHire</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #297a6d; padding: 32px 32px 24px 32px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 8px;">
                    <div style="width: 28px; height: 28px; background-color: rgba(255,255,255,0.2); border-radius: 6px; text-align: center; line-height: 28px;">
                      <span style="color: #ffffff; font-size: 16px; font-weight: bold;">&#x2713;</span>
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">CheckHire</span>
                  </td>
                </tr>
              </table>
              <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 12px 0 0 0;">
                Safe escrow for gig work
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
                Welcome to CheckHire
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                Your account is ready. CheckHire lets you create escrow-backed payment links for gig work &mdash; the safest way to hire and get hired online.
              </p>

              <!-- How it works -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 16px; background-color: #f0faf8; border-radius: 8px;">
                    <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #297a6d; text-transform: uppercase; letter-spacing: 0.5px;">
                      How it works
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #0f172a;">
                          <strong style="color: #297a6d;">1.</strong> Create a gig &amp; fund escrow
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #0f172a;">
                          <strong style="color: #297a6d;">2.</strong> Share the payment link anywhere
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #0f172a;">
                          <strong style="color: #297a6d;">3.</strong> Approve work &amp; release payment
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/deal/new" style="display: inline-block; background-color: #297a6d; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                      Create Your First Payment Link
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                <strong>Remember:</strong> Freelancers pay $0. You pay 5% &mdash; that&rsquo;s it. The freelancer receives exactly the posted amount.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Work with anyone online &mdash; without the risk.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">
                <a href="${appUrl}" style="color: #297a6d; text-decoration: none;">checkhire.co</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `${greeting}

Your CheckHire account is ready. You can now create escrow-backed payment links for gig work.

How it works:
1. Create a gig & fund escrow
2. Share the payment link anywhere
3. Approve work & release payment

Create your first payment link: ${appUrl}/deal/new

Freelancers pay $0. You pay 5%. The freelancer receives exactly the posted amount.

— CheckHire
Work with anyone online — without the risk.`;

  try {
    await resend.emails.send({
      from: "CheckHire <no-reply@checkhire.co>",
      to: [to],
      subject: "Welcome to CheckHire — Your account is ready",
      html,
      text,
      headers: {
        "List-Unsubscribe": `<${appUrl}/settings>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    console.log(`[sendWelcomeEmail] Sent to ${to}`);
  } catch (err) {
    console.error("[sendWelcomeEmail] Failed:", err);
  }
}
