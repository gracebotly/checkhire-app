import { sendEmail } from "./send";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://checkhire.co";

// ── HTML Helpers ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const SCAM_TYPE_LABELS: Record<string, string> = {
  company_impersonation: "Impersonating a real company",
  upfront_payment: "Asking for upfront payment",
  too_good_to_be_true: "Too good to be true",
  personal_info_harvesting: "Asking for personal info too early",
  crypto_gift_card: "Crypto or gift card payment",
  not_sure: "Something feels off",
  other: "Other",
};

const PLATFORM_LABELS: Record<string, string> = {
  reddit: "Reddit",
  facebook: "Facebook",
  indeed: "Indeed",
  linkedin: "LinkedIn",
  discord: "Discord",
  whatsapp: "WhatsApp",
  craigslist: "Craigslist",
  twitter: "Twitter / X",
  other: "Other",
};

function buildScamCheckEmailHtml(options: {
  body: string;
  accentColor?: string;
}): string {
  const accent = options.accentColor || "#0d9488";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
<tr><td align="center" style="padding: 32px 16px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
  <!-- Accent bar -->
  <tr><td style="height: 4px; background-color: ${accent}; font-size: 0; line-height: 0;">&nbsp;</td></tr>
  <!-- Header -->
  <tr><td style="padding: 24px 32px 16px 32px;">
    <img src="${APP_URL}/email-header.png" alt="CheckHire" width="180" height="48" style="display: block; border: 0; outline: none;" />
    <p style="margin: 6px 0 0 0; font-size: 12px; font-weight: 600; color: #1A7A6D; letter-spacing: 0.5px;">SAFEGUARD</p>
  </td></tr>
  <!-- Divider -->
  <tr><td style="padding: 0 32px;"><div style="height: 1px; background-color: #f1f5f9;"></div></td></tr>
  <!-- Body -->
  <tr><td style="padding: 24px 32px 32px 32px; font-size: 14px; color: #475569; line-height: 1.6;">
    ${options.body}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #94a3b8;">CheckHire SafeGuard — Free scam investigations for online hiring</p>
    <p style="margin: 4px 0 0 0; font-size: 12px;"><a href="${APP_URL}" style="color: #94a3b8; text-decoration: underline;">checkhire.co</a></p>
  </td></tr>
</table>

<!-- Below-card text -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">
  <tr><td style="padding: 16px 32px; text-align: center;">
    <p style="margin: 0; font-size: 11px; color: #94a3b8;">You received this because you submitted a scam check on CheckHire.</p>
  </td></tr>
</table>

</td></tr>
</table>
</body>
</html>`;
}

function buildDetailsBlock(fields: Array<{ label: string; value: string }>): string {
  const rows = fields
    .filter((f) => f.value)
    .map(
      (f) =>
        `<tr><td style="padding: 6px 0; font-size: 13px; color: #94a3b8; vertical-align: top; width: 100px;">${f.label}</td><td style="padding: 6px 0; font-size: 13px; color: #0f172a;">${escapeHtml(f.value)}</td></tr>`
    )
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; margin: 16px 0; padding: 12px 0;">
    ${rows}
  </table>`;
}

// ── Email 1: Submission Confirmation ──
// NO product mentions. NO escrow. NO CTAs. Pure trust.

export async function sendScamCheckConfirmation(params: {
  to: string;
  submissionId: string;
  url: string;
  platform: string;
  scamType?: string | null;
  description?: string | null;
  submittedAt: string;
}): Promise<boolean> {
  const caseId = `SC-${params.submissionId.slice(0, 8).toUpperCase()}`;
  const platformLabel = PLATFORM_LABELS[params.platform] || params.platform;
  const scamTypeLabel = params.scamType ? SCAM_TYPE_LABELS[params.scamType] || params.scamType : null;

  const formattedDate = new Date(params.submittedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const detailFields: Array<{ label: string; value: string }> = [
    { label: "Link", value: params.url },
    { label: "Platform", value: platformLabel },
  ];
  if (scamTypeLabel && params.scamType !== "not_sure") {
    detailFields.push({ label: "Concern", value: scamTypeLabel });
  }
  if (params.description) {
    detailFields.push({ label: "Your note", value: params.description });
  }
  detailFields.push({ label: "Submitted", value: formattedDate });
  detailFields.push({ label: "Reference", value: caseId });

  const body = `
    <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #0f172a;">
      We received your submission — we're reviewing it now.
    </p>

    <p style="margin: 0 0 16px 0;">
      Got it &mdash; we&rsquo;ve received your submission and our team is reviewing it.
    </p>

    ${buildDetailsBlock(detailFields)}

    <p style="margin: 16px 0 0 0; font-size: 14px; font-weight: 600; color: #0f172a;">
      What happens next
    </p>
    <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #475569;">
      <li style="margin-bottom: 4px;">We review the posting and verify the company and account</li>
      <li style="margin-bottom: 4px;">We check for known scam patterns and inconsistencies</li>
      <li style="margin-bottom: 4px;">You&rsquo;ll receive a clear verdict within 24&ndash;48 hours</li>
    </ul>

    <p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">
      If you have any additional context, just reply to this email &mdash; it helps with the investigation.
    </p>

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #475569;">
      &mdash; CheckHire SafeGuard
    </p>
  `;

  return sendEmail({
    to: params.to,
    subject: `We received your submission — we're reviewing it now (${caseId})`,
    html: buildScamCheckEmailHtml({ body, accentColor: "#0d9488" }),
    from: "CheckHire SafeGuard <investigations@checkhire.co>",
  });
}

// ── Email 2: Investigation Verdict ──
// Trust has been earned. Soft escrow mention in P.S. only.

export async function sendScamCheckVerdict(params: {
  to: string;
  submissionId: string;
  url: string;
  platform: string;
  status: "safe" | "suspicious" | "confirmed_scam";
  verdictSummary: string;
}): Promise<boolean> {
  const caseId = `SC-${params.submissionId.slice(0, 8).toUpperCase()}`;
  const platformLabel = PLATFORM_LABELS[params.platform] || params.platform;

  // Dynamic subject based on verdict
  const subjectMap: Record<string, string> = {
    safe: `✅ Good news — this posting checks out (${caseId})`,
    suspicious: `⚠️ Proceed with caution — we found red flags (${caseId})`,
    confirmed_scam: `🚨 Confirmed scam — do not engage (${caseId})`,
  };

  // Dynamic verdict header
  const verdictHeaderMap: Record<string, { text: string; color: string; emoji: string }> = {
    safe: { text: "VERIFIED SAFE", color: "#16a34a", emoji: "✅" },
    suspicious: { text: "SUSPICIOUS — PROCEED WITH CAUTION", color: "#d97706", emoji: "⚠️" },
    confirmed_scam: { text: "CONFIRMED SCAM", color: "#dc2626", emoji: "🚨" },
  };

  const header = verdictHeaderMap[params.status];
  const escapedSummary = escapeHtml(params.verdictSummary);

  // Build recommendations based on verdict
  let recommendations = "";

  if (params.status === "confirmed_scam") {
    recommendations = `
      <p style="margin: 20px 0 0 0; font-size: 14px; font-weight: 600; color: #0f172a;">What to do next</p>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #475569;">
        <li style="margin-bottom: 4px;">Do not engage further with this poster</li>
        <li style="margin-bottom: 4px;">Report the listing on ${escapeHtml(platformLabel)} using their built-in tools</li>
        <li style="margin-bottom: 4px;">If you shared any personal info, monitor your accounts closely</li>
      </ul>
      <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748b;">
        We&rsquo;ve flagged this case in our system to help identify similar scams.
      </p>
    `;
  } else if (params.status === "suspicious") {
    recommendations = `
      <p style="margin: 20px 0 0 0; font-size: 14px; font-weight: 600; color: #0f172a;">What we recommend</p>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #475569;">
        <li style="margin-bottom: 4px;">Verify the company independently before sharing personal info</li>
        <li style="margin-bottom: 4px;">Ask for a video call &mdash; real clients have no problem going on camera</li>
        <li style="margin-bottom: 4px;">Insist on structured payment protection for any paid work</li>
      </ul>
    `;
  } else {
    recommendations = `
      <p style="margin: 20px 0 0 0; font-size: 14px; font-weight: 600; color: #0f172a;">You&rsquo;re good to go</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569;">
        We didn&rsquo;t find anything concerning. That said, always use good judgment &mdash; verify payment terms in writing before starting work, and don&rsquo;t share sensitive personal information until you&rsquo;re confident the opportunity is real.
      </p>
    `;
  }

  // Soft escrow P.S. — advice, not a pitch
  const ps = `
    <div style="margin: 28px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 13px; color: #64748b;">
        <strong>P.S.</strong> If you ever decide to move forward with someone you found online, the safest way is to use escrow &mdash; funds are only released after the work is done.
        <a href="${APP_URL}/deal/new" style="color: #0d9488; text-decoration: underline;">Create a secure payment link</a>
      </p>
    </div>
  `;

  // Share prompt — virality lever
  const sharePrompt = `
    <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
      Feel free to share this with anyone who might be dealing with the same posting.
    </p>
  `;

  const body = `
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
      Our investigation into the posting you submitted is complete.
    </p>

    <!-- Verdict Banner -->
    <div style="background-color: ${header.color}10; border: 1px solid ${header.color}30; border-radius: 8px; padding: 16px; text-align: center; margin: 0 0 20px 0;">
      <p style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; color: ${header.color};">
        ${header.emoji} VERDICT: ${header.text}
      </p>
    </div>

    ${buildDetailsBlock([
      { label: "Link", value: params.url },
      { label: "Platform", value: platformLabel },
      { label: "Case", value: caseId },
    ])}

    <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #0f172a;">What we found</p>
    <p style="margin: 0; font-size: 14px; color: #475569; white-space: pre-line;">${escapedSummary}</p>

    ${recommendations}

    ${sharePrompt}

    <p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">
      If you ever want a second opinion before working with someone online, you can always send it over &mdash; we&rsquo;ll take a look.
    </p>

    <div style="text-align: center; margin: 24px 0 0 0;">
      <a href="${APP_URL}" style="display: inline-block; padding: 10px 24px; background-color: #0d9488; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">Submit Another Check</a>
    </div>

    ${ps}

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #475569;">
      &mdash; CheckHire SafeGuard
    </p>
  `;

  return sendEmail({
    to: params.to,
    subject: subjectMap[params.status],
    from: "CheckHire SafeGuard <investigations@checkhire.co>",
    html: buildScamCheckEmailHtml({
      body,
      accentColor: header.color,
    }),
  });
}
