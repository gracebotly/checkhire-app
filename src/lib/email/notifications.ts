import { sendEmail } from "./send";
import type { NotificationType } from "@/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://checkhire.com";

function dealUrl(slug: string): string {
  return `${APP_URL}/deal/${slug}`;
}

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; background: #0d9488; color: #fff; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 16px;">${label}</a>`;
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

export type NotificationData = {
  dealTitle: string;
  dealSlug: string;
  amount?: number;
  otherPartyName?: string;
  notes?: string;
  milestoneTitle?: string;
  role?: "client" | "freelancer";
  revisionNumber?: number;
  code?: string;
  category?: string;
  percentage?: number;
};

type NotificationConfig = {
  subject: (d: NotificationData) => string;
  body: (d: NotificationData) => string;
  cta: (d: NotificationData) => { label: string; href: string } | null;
};

const NOTIFICATION_CONFIG: Record<NotificationType, NotificationConfig> = {
  deal_created: {
    subject: (d) => `Your gig is live — ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Gig Created</h2>` +
      `<p style="color: #475569; font-size: 14px;">Your gig <strong>${d.dealTitle}</strong> is live. Share the link with your freelancer to get started.</p>`,
    cta: (d) => ({ label: "View Your Gig", href: dealUrl(d.dealSlug) }),
  },
  deal_accepted: {
    subject: (d) => `${d.otherPartyName || "Someone"} accepted your gig`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Gig Accepted</h2>` +
      `<p style="color: #475569; font-size: 14px;"><strong>${d.otherPartyName || "A freelancer"}</strong> accepted <strong>${d.dealTitle}</strong>. Fund the escrow to secure the deal and start work.</p>`,
    cta: (d) => ({ label: "Fund Escrow", href: dealUrl(d.dealSlug) }),
  },
  escrow_funded: {
    subject: (d) => `Payment Secured — ${formatAmount(d.amount!)} for ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Payment Secured</h2>` +
      `<p style="color: #475569; font-size: 14px;"><strong>${formatAmount(d.amount!)}</strong> has been secured in escrow for <strong>${d.dealTitle}</strong>. The client has funded the deal — you're clear to start work.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  milestone_funded: {
    subject: (d) => `Milestone funded — ${d.milestoneTitle} (${formatAmount(d.amount!)})`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Milestone Funded</h2>` +
      `<p style="color: #475569; font-size: 14px;"><strong>${formatAmount(d.amount!)}</strong> has been secured for milestone <strong>${d.milestoneTitle}</strong> on <strong>${d.dealTitle}</strong>.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  work_submitted: {
    subject: (d) => `Work submitted on ${d.dealTitle} — 72 hours to review`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Work Submitted for Review</h2>` +
      `<p style="color: #475569; font-size: 14px;">The freelancer has submitted work on <strong>${d.dealTitle}</strong> (${formatAmount(d.amount!)}). You have <strong>72 hours</strong> to review and either confirm delivery, request a revision, or open a dispute. If you take no action, funds will auto-release to the freelancer.</p>`,
    cta: (d) => ({ label: "Review Now", href: dealUrl(d.dealSlug) }),
  },
  milestone_submitted: {
    subject: (d) => `Milestone submitted — ${d.milestoneTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Milestone Submitted</h2>` +
      `<p style="color: #475569; font-size: 14px;">Milestone <strong>${d.milestoneTitle}</strong> on <strong>${d.dealTitle}</strong> has been submitted for review. You have 72 hours to approve.</p>`,
    cta: (d) => ({ label: "Review Now", href: dealUrl(d.dealSlug) }),
  },
  auto_release_warning_24h: {
    subject: (d) => `24 hours to review ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #d97706; font-size: 20px;">24 Hours Remaining</h2>` +
      `<p style="color: #475569; font-size: 14px;">You have <strong>24 hours</strong> left to review the submitted work on <strong>${d.dealTitle}</strong> (${formatAmount(d.amount!)}). If you don't confirm delivery, request a revision, or open a dispute before the deadline, funds will <strong>auto-release</strong> to the freelancer.</p>`,
    cta: (d) => ({ label: "Review Now", href: dealUrl(d.dealSlug) }),
  },
  auto_release_warning_6h: {
    subject: (d) => `6 hours remaining — review ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #dc2626; font-size: 20px;">6 Hours Remaining</h2>` +
      `<p style="color: #475569; font-size: 14px;">You have <strong>6 hours</strong> left to review <strong>${d.dealTitle}</strong> (${formatAmount(d.amount!)}). After the deadline, funds will <strong>auto-release</strong> to the freelancer.</p>`,
    cta: (d) => ({ label: "Review Now", href: dealUrl(d.dealSlug) }),
  },
  auto_release_completed: {
    subject: (d) => `Funds auto-released — ${d.dealTitle}`,
    body: (d) => {
      const msg =
        d.role === "freelancer"
          ? `${formatAmount(d.amount!)} has been released to your account for <strong>${d.dealTitle}</strong>. The 72-hour review period expired with no action from the client.`
          : `The 72-hour review period for <strong>${d.dealTitle}</strong> has expired. ${formatAmount(d.amount!)} has been auto-released to the freelancer.`;
      return `<h2 style="color: #0f172a; font-size: 20px;">Funds Released</h2><p style="color: #475569; font-size: 14px;">${msg}</p>`;
    },
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  milestone_approved: {
    subject: (d) => `Milestone approved — ${formatAmount(d.amount!)} released`,
    body: (d) =>
      `<h2 style="color: #0d9488; font-size: 20px;">Milestone Approved</h2>` +
      `<p style="color: #475569; font-size: 14px;">The client approved milestone <strong>${d.milestoneTitle}</strong> on <strong>${d.dealTitle}</strong>. <strong>${formatAmount(d.amount!)}</strong> has been released to your account.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  deal_completed: {
    subject: (d) => `Gig complete — ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0d9488; font-size: 20px;">Gig Complete</h2>` +
      `<p style="color: #475569; font-size: 14px;"><strong>${d.dealTitle}</strong> is complete. Leave a rating for ${d.otherPartyName || "the other party"} to build your trust reputation.</p>`,
    cta: (d) => ({ label: "Leave a Rating", href: dealUrl(d.dealSlug) }),
  },
  revision_requested: {
    subject: (d) => `Revision requested on ${d.dealTitle} (${d.revisionNumber || 1}/3)`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Revision Requested</h2>` +
      `<p style="color: #475569; font-size: 14px;">The client has requested a revision on <strong>${d.dealTitle}</strong> (revision ${d.revisionNumber || 1} of 3).</p>` +
      (d.notes
        ? `<div style="background: #f8fafc; border-left: 3px solid #0d9488; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #334155;">${d.notes}</div>`
        : ""),
    cta: (d) => ({ label: "View Details", href: dealUrl(d.dealSlug) }),
  },
  rating_reminder: {
    subject: (d) => `Leave a rating for ${d.otherPartyName || "your gig partner"}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">How Did It Go?</h2>` +
      `<p style="color: #475569; font-size: 14px;">Your gig <strong>${d.dealTitle}</strong> was completed. Leave a rating for <strong>${d.otherPartyName || "the other party"}</strong> to help build trust in the community.</p>`,
    cta: (d) => ({ label: "Rate Now", href: dealUrl(d.dealSlug) }),
  },
  dispute_opened: {
    subject: (d) => `Dispute opened on ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #dc2626; font-size: 20px;">Dispute Opened</h2>` +
      `<p style="color: #475569; font-size: 14px;">${d.otherPartyName || "The other party"} has opened a dispute on <strong>${d.dealTitle}</strong>. Funds are frozen until the dispute is resolved.</p>`,
    cta: (d) => ({ label: "View Dispute", href: dealUrl(d.dealSlug) }),
  },
  dispute_resolved: {
    subject: (d) => `Dispute resolved — ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Dispute Resolved</h2>` +
      `<p style="color: #475569; font-size: 14px;">The dispute on <strong>${d.dealTitle}</strong> has been resolved. Check the deal page for the decision and next steps.</p>`,
    cta: (d) => ({ label: "View Resolution", href: dealUrl(d.dealSlug) }),
  },
  interest_received: {
    subject: (d) => `Someone is interested in ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">New Interest</h2>` +
      `<p style="color: #475569; font-size: 14px;"><strong>${d.otherPartyName || "A freelancer"}</strong> is interested in your gig <strong>${d.dealTitle}</strong>. Review their pitch and decide if they're the right fit.</p>`,
    cta: (d) => ({ label: "Review Pitches", href: dealUrl(d.dealSlug) }),
  },
  interest_accepted: {
    subject: (d) => `You've been selected for ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0d9488; font-size: 20px;">You're Selected!</h2>` +
      `<p style="color: #475569; font-size: 14px;">Great news — the client chose you for <strong>${d.dealTitle}</strong>${d.amount ? ` (${formatAmount(d.amount)})` : ""}. Review the deal terms and get started.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  deal_filled: {
    subject: (d) => `${d.dealTitle} has been filled`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Gig Filled</h2>` +
      `<p style="color: #475569; font-size: 14px;">The client selected someone else for <strong>${d.dealTitle}</strong>. Keep an eye out for other open gigs!</p>`,
    cta: () => ({ label: "Browse Gigs", href: `${APP_URL}/gigs` }),
  },
  milestone_proposed: {
    subject: (d) => `Milestone change proposed on ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Milestone Proposal</h2>` +
      `<p style="color: #475569; font-size: 14px;">${d.otherPartyName || "The other party"} has proposed a milestone change on <strong>${d.dealTitle}</strong>. Review and approve or reject the proposal.</p>`,
    cta: (d) => ({ label: "Review Proposal", href: dealUrl(d.dealSlug) }),
  },
  milestone_change_approved: {
    subject: (d) => `Milestone change approved on ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Proposal Approved</h2>` +
      `<p style="color: #475569; font-size: 14px;">Your milestone change proposal on <strong>${d.dealTitle}</strong> was approved.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  deal_cancelled: {
    subject: (d) => `Gig cancelled — ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Gig Cancelled</h2>` +
      `<p style="color: #475569; font-size: 14px;">The gig <strong>${d.dealTitle}</strong> has been cancelled.</p>`,
    cta: (d) => ({ label: "View Details", href: dealUrl(d.dealSlug) }),
  },
  guest_verification_code: {
    subject: (d) => `Your verification code for ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Verification Code</h2>` +
      `<p style="color: #475569; font-size: 14px;">Your code to accept <strong>${d.dealTitle}</strong> is:</p>` +
      `<p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; text-align: center; color: #0d9488;">${d.code || "------"}</p>` +
      `<p style="color: #475569; font-size: 14px;">This code expires in 15 minutes.</p>`,
    cta: () => null,
  },
  deal_accepted_escrow_pending: {
    subject: (d) => `You accepted ${d.dealTitle} — waiting for escrow`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Gig Accepted</h2>` +
      `<p style="color: #475569; font-size: 14px;">You accepted <strong>${d.dealTitle}</strong>. The client hasn't funded escrow yet — you'll be notified when payment is secured.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  escrow_funded_after_accept: {
    subject: (d) => `Escrow funded — ${d.dealTitle} is ready to start`,
    body: (d) =>
      `<h2 style="color: #0d9488; font-size: 20px;">Payment Secured</h2>` +
      `<p style="color: #475569; font-size: 14px;">${formatAmount(d.amount!)} has been secured in escrow for <strong>${d.dealTitle}</strong>. You're clear to start work.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  funds_released: {
    subject: (d) => `Funds released — ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0d9488; font-size: 20px;">Funds Released</h2>` +
      `<p style="color: #475569; font-size: 14px;">${formatAmount(d.amount!)} has been released for <strong>${d.dealTitle}</strong>.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  deal_cancelled_to_freelancer: {
    subject: (d) => `Gig cancelled — ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Gig Cancelled</h2>` +
      `<p style="color: #475569; font-size: 14px;">The client cancelled <strong>${d.dealTitle}</strong>. No further action is needed.</p>`,
    cta: () => null,
  },
  auto_expire_warning_14d: {
    subject: (d) => `Action needed — ${d.dealTitle} expires in 16 days`,
    body: (d) =>
      `<h2 style="color: #d97706; font-size: 20px;">Gig Expiring Soon</h2>` +
      `<p style="color: #475569; font-size: 14px;">Your funded gig <strong>${d.dealTitle}</strong> has no freelancer yet. If nobody accepts within 30 days of funding, the escrow will be automatically refunded.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  auto_expire_warning_27d: {
    subject: (d) => `Final warning — ${d.dealTitle} expires in 3 days`,
    body: (d) =>
      `<h2 style="color: #dc2626; font-size: 20px;">Final Warning</h2>` +
      `<p style="color: #475569; font-size: 14px;">Your gig <strong>${d.dealTitle}</strong> will be auto-refunded in 3 days if no freelancer accepts. Share the gig link to find someone.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  auto_expire_completed: {
    subject: (d) => `Gig expired — ${d.dealTitle} refunded`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Gig Expired & Refunded</h2>` +
      `<p style="color: #475569; font-size: 14px;">Your gig <strong>${d.dealTitle}</strong> expired without a freelancer. ${formatAmount(d.amount!)} has been refunded to your original payment method.</p>`,
    cta: () => null,
  },
  freelancer_ghost_nudge_7d: {
    subject: (d) => `Reminder — ${d.dealTitle} is waiting for you`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Time to Get Started</h2>` +
      `<p style="color: #475569; font-size: 14px;">It's been 7 days since you accepted <strong>${d.dealTitle}</strong> and no work evidence has been uploaded. The client is waiting — upload your progress to keep things moving.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  freelancer_ghost_warning_14d: {
    subject: (d) => `No activity on ${d.dealTitle} — 14 days`,
    body: (d) =>
      `<h2 style="color: #d97706; font-size: 20px;">No Freelancer Activity</h2>` +
      `<p style="color: #475569; font-size: 14px;">It's been 14 days since the freelancer accepted <strong>${d.dealTitle}</strong> with no evidence uploaded. If no progress is made within 21 days, the gig will be auto-refunded. You can also cancel or open a dispute.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  guest_deal_invite: {
    subject: (d) => `You've been invited to a gig — ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Gig Invitation</h2>` +
      `<p style="color: #475569; font-size: 14px;">You've been invited to work on <strong>${d.dealTitle}</strong>. Click below to review the details and accept.</p>`,
    cta: (d) => ({ label: "View Gig", href: dealUrl(d.dealSlug) }),
  },
  dispute_proposal_received: {
    subject: (d) => `Counter-proposal on ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Counter-Proposal Received</h2>` +
      `<p style="color: #475569; font-size: 14px;">The other party has submitted a counter-proposal on the dispute for <strong>${d.dealTitle}</strong>. Review their proposal and respond.</p>`,
    cta: (d) => ({ label: "View Dispute", href: dealUrl(d.dealSlug) }),
  },
  dispute_auto_resolved: {
    subject: (d) => `Dispute auto-resolved — ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0d9488; font-size: 20px;">Dispute Resolved</h2>` +
      `<p style="color: #475569; font-size: 14px;">The dispute on <strong>${d.dealTitle}</strong> has been automatically resolved based on the proposals submitted by both parties.</p>`,
    cta: (d) => ({ label: "View Resolution", href: dealUrl(d.dealSlug) }),
  },
  dispute_negotiation_round: {
    subject: (d) => `Negotiation round on ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #0f172a; font-size: 20px;">Negotiation Round</h2>` +
      `<p style="color: #475569; font-size: 14px;">Both proposals for <strong>${d.dealTitle}</strong> don't overlap. You have one more chance to adjust your proposal before the dispute is escalated for review.</p>`,
    cta: (d) => ({ label: "Adjust Proposal", href: dealUrl(d.dealSlug) }),
  },
  dispute_escalated: {
    subject: (d) => `Dispute escalated — ${d.dealTitle}`,
    body: (d) =>
      `<h2 style="color: #dc2626; font-size: 20px;">Dispute Escalated</h2>` +
      `<p style="color: #475569; font-size: 14px;">The dispute on <strong>${d.dealTitle}</strong> could not be resolved through negotiation and has been escalated for admin review.</p>`,
    cta: (d) => ({ label: "View Dispute", href: dealUrl(d.dealSlug) }),
  },
};

export async function sendDealNotification(params: {
  type: NotificationType;
  to: string;
  data: NotificationData;
}): Promise<boolean> {
  const config = NOTIFICATION_CONFIG[params.type];
  if (!config) {
    console.warn(`[sendDealNotification] Unknown notification type: ${params.type}`);
    return false;
  }

  const subject = config.subject(params.data);
  const bodyHtml = config.body(params.data);
  const cta = config.cta(params.data);
  const ctaHtml = cta ? ctaButton(cta.href, cta.label) : "";

  return sendEmail({
    to: params.to,
    subject,
    html: wrapHtml(`${bodyHtml}${ctaHtml}`),
  });
}
