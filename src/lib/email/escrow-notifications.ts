import { sendEmail } from "./send";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://checkhire.com";

function dealUrl(slug: string): string {
  return `${APP_URL}/deal/${slug}`;
}

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function wrapHtml(body: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      ${body}
      <p style="margin-top: 32px; font-size: 12px; color: #64748b;">
        CheckHire — You found each other. We make sure nobody gets screwed.
      </p>
    </div>
  `;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; background: #0d9488; color: #fff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px;">${label}</a>`;
}

// ── Escrow Funded ──
export async function sendEscrowFundedEmail(params: {
  to: string;
  dealTitle: string;
  dealSlug: string;
  amount: number; // cents
}) {
  const { to, dealTitle, dealSlug, amount } = params;
  return sendEmail({
    to,
    subject: `Payment Secured — ${formatAmount(amount)} held in escrow for "${dealTitle}"`,
    html: wrapHtml(`
      <h2 style="color: #0f172a; font-size: 20px;">Payment Secured</h2>
      <p style="color: #475569; font-size: 14px;">
        <strong>${formatAmount(amount)}</strong> has been secured in escrow for <strong>${dealTitle}</strong>.
        The client has funded the deal — you're clear to start work.
      </p>
      ${ctaButton(dealUrl(dealSlug), "View Gig")}
    `),
  });
}

// ── Work Submitted (72hr countdown starts) ──
export async function sendWorkSubmittedEmail(params: {
  to: string;
  dealTitle: string;
  dealSlug: string;
  amount: number;
}) {
  const { to, dealTitle, dealSlug, amount } = params;
  return sendEmail({
    to,
    subject: `Work submitted on "${dealTitle}" — you have 72 hours to review`,
    html: wrapHtml(`
      <h2 style="color: #0f172a; font-size: 20px;">Work Submitted for Review</h2>
      <p style="color: #475569; font-size: 14px;">
        The freelancer has submitted work on <strong>${dealTitle}</strong> (${formatAmount(amount)}).
      </p>
      <p style="color: #475569; font-size: 14px;">
        You have <strong>72 hours</strong> to review and either confirm delivery, request a revision, or open a dispute.
        If you take no action, funds will auto-release to the freelancer.
      </p>
      ${ctaButton(dealUrl(dealSlug), "Review Now")}
    `),
  });
}

// ── Auto-Release Warning (24h or 6h) ──
export async function sendAutoReleaseWarningEmail(params: {
  to: string;
  dealTitle: string;
  dealSlug: string;
  amount: number;
  hoursRemaining: 24 | 6;
}) {
  const { to, dealTitle, dealSlug, amount, hoursRemaining } = params;
  const urgency = hoursRemaining === 6 ? "⚠️ " : "";
  return sendEmail({
    to,
    subject: `${urgency}${hoursRemaining} hours remaining to review "${dealTitle}"`,
    html: wrapHtml(`
      <h2 style="color: ${hoursRemaining === 6 ? "#dc2626" : "#d97706"}; font-size: 20px;">
        ${hoursRemaining} Hours Remaining
      </h2>
      <p style="color: #475569; font-size: 14px;">
        You have <strong>${hoursRemaining} hours</strong> left to review the submitted work on <strong>${dealTitle}</strong> (${formatAmount(amount)}).
        If you don't confirm delivery, request a revision, or open a dispute before the deadline, funds will <strong>auto-release</strong> to the freelancer.
      </p>
      ${ctaButton(dealUrl(dealSlug), "Review Now")}
    `),
  });
}

// ── Auto-Release Completed ──
export async function sendAutoReleaseCompletedEmail(params: {
  to: string;
  dealTitle: string;
  dealSlug: string;
  amount: number;
  role: "client" | "freelancer";
}) {
  const { to, dealTitle, dealSlug, amount, role } = params;
  const message = role === "freelancer"
    ? `${formatAmount(amount)} has been released to your account for <strong>${dealTitle}</strong>. The 72-hour review period expired with no action from the client.`
    : `The 72-hour review period for <strong>${dealTitle}</strong> has expired. ${formatAmount(amount)} has been auto-released to the freelancer.`;

  return sendEmail({
    to,
    subject: `Funds auto-released on "${dealTitle}" — ${formatAmount(amount)}`,
    html: wrapHtml(`
      <h2 style="color: #0f172a; font-size: 20px;">Funds Released</h2>
      <p style="color: #475569; font-size: 14px;">${message}</p>
      ${ctaButton(dealUrl(dealSlug), "View Gig")}
    `),
  });
}

// ── Delivery Confirmed ──
export async function sendDeliveryConfirmedEmail(params: {
  to: string;
  dealTitle: string;
  dealSlug: string;
  amount: number;
}) {
  const { to, dealTitle, dealSlug, amount } = params;
  return sendEmail({
    to,
    subject: `${formatAmount(amount)} released for "${dealTitle}"`,
    html: wrapHtml(`
      <h2 style="color: #0d9488; font-size: 20px;">You Got Paid!</h2>
      <p style="color: #475569; font-size: 14px;">
        The client confirmed delivery on <strong>${dealTitle}</strong>.
        <strong>${formatAmount(amount)}</strong> has been released to your account.
      </p>
      ${ctaButton(dealUrl(dealSlug), "View Gig")}
    `),
  });
}

// ── Revision Requested ──
export async function sendRevisionRequestedEmail(params: {
  to: string;
  dealTitle: string;
  dealSlug: string;
  notes: string;
  revisionNumber: number;
}) {
  const { to, dealTitle, dealSlug, notes, revisionNumber } = params;
  return sendEmail({
    to,
    subject: `Revision requested on "${dealTitle}" (${revisionNumber}/3)`,
    html: wrapHtml(`
      <h2 style="color: #0f172a; font-size: 20px;">Revision Requested</h2>
      <p style="color: #475569; font-size: 14px;">
        The client has requested a revision on <strong>${dealTitle}</strong> (revision ${revisionNumber} of 3).
      </p>
      <div style="background: #f8fafc; border-left: 3px solid #0d9488; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #334155;">
        ${notes}
      </div>
      ${ctaButton(dealUrl(dealSlug), "View Details")}
    `),
  });
}

// ── Milestone Funded ──
export async function sendMilestoneFundedEmail(params: {
  to: string;
  dealTitle: string;
  dealSlug: string;
  milestoneTitle: string;
  amount: number;
}) {
  const { to, dealTitle, dealSlug, milestoneTitle, amount } = params;
  return sendEmail({
    to,
    subject: `Milestone "${milestoneTitle}" funded — ${formatAmount(amount)} secured`,
    html: wrapHtml(`
      <h2 style="color: #0f172a; font-size: 20px;">Milestone Funded</h2>
      <p style="color: #475569; font-size: 14px;">
        <strong>${formatAmount(amount)}</strong> has been secured for milestone <strong>${milestoneTitle}</strong> on <strong>${dealTitle}</strong>.
      </p>
      ${ctaButton(dealUrl(dealSlug), "View Gig")}
    `),
  });
}
