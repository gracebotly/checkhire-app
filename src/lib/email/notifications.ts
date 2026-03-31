import { sendEmail } from './send';
import type { NotificationData as DbNotificationData, NotificationType } from '@/types/database';

export type NotificationData = DbNotificationData;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://checkhire.com';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function dealUrl(slug: string): string {
  return `${APP_URL}/deal/${slug}`;
}

function buildEmailHtml(options: { body: string; accentColor?: string }): string {
  const accent = options.accentColor || '#0d9488';

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <tr><td style="height: 4px; background: ${accent}; font-size: 0; line-height: 0;">&nbsp;</td></tr>
        <tr><td style="padding: 24px 32px 16px 32px; font-size: 18px; font-weight: 700; color: #0f172a;">🛡️ CheckHire</td></tr>
        <tr><td style="height: 1px; background: #f1f5f9; font-size: 0; line-height: 0;">&nbsp;</td></tr>
        <tr><td style="padding: 24px 32px 32px 32px;">${options.body}</td></tr>
        <tr>
          <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
            CheckHire — Secure escrow for gig work<br/>
            <a href="${APP_URL}" style="color: #64748b; text-decoration: underline;">checkhire.com</a>
          </td>
        </tr>
      </table>
      <div style="max-width: 520px; margin-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
        You received this email because of activity on your CheckHire gig.<br/>
        <a href="${APP_URL}/settings" style="color: #64748b; text-decoration: underline;">Manage notifications</a>
      </div>
    </td>
  </tr>
</table>`;
}

function buildCtaButton(href: string, label: string, variant: 'primary' | 'urgent' | 'success' | 'neutral' = 'primary'): string {
  const colors = {
    primary: '#0d9488',
    urgent: '#d97706',
    success: '#16a34a',
    neutral: '#475569',
  } as const;

  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
  <tr>
    <td style="border-radius: 8px; background: ${colors[variant]};">
      <a href="${href}" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none;">${label}</a>
    </td>
  </tr>
</table>`;
}

function buildHeroAmount(amountCents: number, label?: string, variant = 'secured'): string {
  const variants: Record<string, { icon: string; color: string; bg: string; label: string }> = {
    secured: { icon: '🔒', color: '#0d9488', bg: '#f0fdfa', label: 'Held securely in escrow' },
    released: { icon: '✅', color: '#16a34a', bg: '#f0fdf4', label: 'Released to your bank' },
    milestone: { icon: '✅', color: '#16a34a', bg: '#f0fdf4', label: 'Milestone payment released' },
    refund: { icon: '↩️', color: '#64748b', bg: '#f8fafc', label: 'Refund processing — 5-10 business days' },
    auto_released: { icon: '⚡', color: '#16a34a', bg: '#f0fdf4', label: 'Auto-released — 72hr review expired' },
    slate: { icon: 'ℹ️', color: '#475569', bg: '#f8fafc', label: 'Review period expired' },
  };
  const v = variants[variant] || variants.secured;

  return `<div style="background: ${v.bg}; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin: 8px 0 18px 0;">
    <div style="font-size: 18px; color: ${v.color}; margin-bottom: 8px;">${v.icon}</div>
    <div style="font-size: 36px; font-weight: 700; letter-spacing: -0.5px; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace, -apple-system, sans-serif; color: #0f172a;">${formatAmount(amountCents)}</div>
    <div style="margin-top: 8px; font-size: 13px; color: #64748b;">${label || v.label}</div>
  </div>`;
}

function buildCountdownBlock(hours: number): string {
  const style =
    hours > 24
      ? { color: '#0d9488', bg: '#f0fdfa' }
      : hours > 6
        ? { color: '#d97706', bg: '#fffbeb' }
        : { color: '#dc2626', bg: '#fef2f2' };

  return `<div style="background: ${style.bg}; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 12px; text-align: center; margin: 8px 0 16px 0;">
    <div style="font-size: 42px; font-weight: 700; letter-spacing: 2px; font-family: monospace; color: ${style.color};">${hours}:00:00</div>
    <div style="font-size: 11px; letter-spacing: 1.6px; color: ${style.color}; font-weight: 700;">HOURS REMAINING</div>
  </div>`;
}

function buildVerificationCodeBlock(code: string): string {
  return `<div style="text-align: center; margin: 10px 0 18px 0;">
    <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: monospace; color: #0f172a; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px 16px;">${escapeHtml(code)}</div>
    <div style="margin-top: 10px; font-size: 12px; color: #64748b;">Expires in 15 minutes</div>
  </div>`;
}

function personBlock(d: NotificationData): string {
  const initials = escapeHtml(d.initials || '?');
  const name = escapeHtml(d.otherPartyName || d.guestName || 'Someone');
  return `<div style="display: flex; align-items: center; gap: 10px; margin: 8px 0 16px 0;">
    <div style="width: 40px; height: 40px; border-radius: 999px; background: #f0fdfa; color: #0d9488; display: inline-flex; align-items: center; justify-content: center; font-weight: 700;">${initials}</div>
    <div style="display: inline-block; vertical-align: middle; margin-left: 10px; font-weight: 600; color: #0f172a;">${name}</div>
  </div>`;
}

type TemplateConfig = {
  subject: (d: NotificationData) => string;
  accent: string;
  body: (d: NotificationData) => string;
};

const NOTIFICATION_CONFIG: Record<NotificationType, TemplateConfig> = {
  guest_verification_code: { subject: () => 'Your CheckHire verification code', accent: '#0d9488', body: (d) => `<h2 style="margin: 0 0 10px 0; color: #0f172a;">Verify your email</h2>${buildVerificationCodeBlock(d.verificationCode || d.code || '------')}<p style="color: #475569; font-size: 14px;">Enter this code on the deal page to accept the gig.</p><p style="color: #64748b; font-size: 13px;">If you didn't request this, ignore this email.</p>` },
  deal_created: { subject: () => 'Your gig is live — share your payment link', accent: '#0d9488', body: (d) => `<h2 style="margin: 0 0 12px 0; color: #0f172a;">Your Gig is Live</h2><div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;"><div style="font-size: 11px; letter-spacing: 1px; color: #64748b; font-weight: 700;">YOUR PAYMENT LINK</div><a href="${dealUrl(d.dealSlug)}" style="color: #0d9488; font-size: 14px; word-break: break-all;">${dealUrl(d.dealSlug)}</a></div>${typeof d.amount === 'number' ? `<p style="color: #475569;">Budget: <strong>${formatAmount(d.amount)}</strong></p>` : ''}${buildCtaButton(dealUrl(d.dealSlug), 'View Your Gig', 'primary')}` },
  deal_accepted: { subject: (d) => `${escapeHtml(d.otherPartyName || 'Someone')} accepted your gig — ${escapeHtml(d.dealTitle)}`, accent: '#0d9488', body: (d) => `<h2 style="margin: 0 0 10px 0; color: #0f172a;">Gig Accepted</h2>${personBlock(d)}<p style="color: #475569; font-size: 14px;">${d.escrowFunded ? 'The deal is live.' : 'Fund escrow to get started.'}</p>${buildCtaButton(dealUrl(d.dealSlug), d.escrowFunded ? 'View Deal' : 'Fund Escrow', 'primary')}` },
  deal_accepted_escrow_pending: { subject: (d) => `You accepted ${escapeHtml(d.dealTitle)} — waiting for payment`, accent: '#0d9488', body: (d) => `<h2 style="margin: 0 0 10px 0; color: #0f172a;">You're In</h2><p style="color: #475569;">Client hasn't funded escrow yet — we'll notify you.</p><p style="color: #64748b;">No payment = no obligation.</p>${buildCtaButton(dealUrl(d.dealSlug), 'View Deal', 'primary')}` },
  escrow_funded: { subject: (d) => `💰 ${formatAmount(d.amount || 0)} secured — ${escapeHtml(d.dealTitle)}`, accent: '#16a34a', body: (d) => `${buildHeroAmount(d.amount || 0, undefined, 'secured')}<p style="color: #475569;">The money is real. Start working and upload evidence.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Start Working', 'success')}` },
  escrow_funded_after_accept: { subject: (d) => `💰 ${formatAmount(d.amount || 0)} secured — ${escapeHtml(d.dealTitle)}`, accent: '#16a34a', body: (d) => `${buildHeroAmount(d.amount || 0, undefined, 'secured')}<p style="color: #475569;">The money is real. Start working and upload evidence.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Start Working', 'success')}` },
  work_submitted: { subject: () => '⏰ Work submitted — review within 72 hours', accent: '#d97706', body: (d) => `${buildCountdownBlock(72)}<p style="color: #475569;">You have 72 hours to:</p><p style="margin: 0; color: #334155;">✅ Confirm delivery<br/>✏️ Request revision<br/>⚠️ Open dispute</p><p style="color: #64748b;">If no response, funds auto-release.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Review Now', 'urgent')}` },
  auto_release_warning_24h: { subject: (d) => `⚠️ 24 hours left — ${formatAmount(d.amount || 0)} releases tomorrow`, accent: '#d97706', body: (d) => `${buildCountdownBlock(24)}<p style="color: #475569;">24 hours left to review.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Review Now', 'urgent')}` },
  auto_release_warning_6h: { subject: (d) => `🚨 6 hours — ${formatAmount(d.amount || 0)} auto-releases soon`, accent: '#dc2626', body: (d) => `${buildCountdownBlock(6)}<p style="color: #475569;">Final notice. 6 hours left.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Review Now', 'urgent').replace('#d97706', '#dc2626')}` },
  auto_release_completed: { subject: (d) => d.role === 'freelancer' ? `🎉 ${formatAmount(d.amount || 0)} released — check your bank` : `Funds auto-released — ${escapeHtml(d.dealTitle)}`, accent: '#16a34a', body: (d) => d.role === 'freelancer' ? `${buildHeroAmount(d.amount || 0, undefined, 'auto_released')}<p style="color: #475569;">Payouts may take 1-2 business days to settle in your bank.</p>${d.isGuestFreelancer ? '<div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 14px 18px; color: #115e59;">Build your reputation — create a free account.</div>' : ''}${buildCtaButton(dealUrl(d.dealSlug), 'View Payout', 'success')}` : `${buildHeroAmount(d.amount || 0, 'Review period expired.', 'slate')}<p style="color: #475569;">Review period expired.</p>${buildCtaButton(dealUrl(d.dealSlug), 'View Gig', 'neutral')}` },
  funds_released: { subject: (d) => `🎉 ${formatAmount(d.amount || 0)} released — check your bank`, accent: '#16a34a', body: (d) => `${buildHeroAmount(d.amount || 0, undefined, 'released')}<p style="color: #475569;">Client confirmed delivery.</p><p style="color: #64748b;">Payouts may take 1-2 business days to settle in your bank.</p>${d.isGuestFreelancer ? '<div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 14px 18px; color: #115e59;">Build your reputation. Create a free account.</div>' : ''}${buildCtaButton(dealUrl(d.dealSlug), 'View Payout', 'success')}` },
  deal_completed: { subject: (d) => `Gig complete — leave a rating for ${escapeHtml(d.otherPartyName || 'your collaborator')}`, accent: '#16a34a', body: (d) => `<h2 style="margin: 0 0 10px 0; color: #0f172a;">Gig Complete! 🎉</h2><p style="color: #475569;">Rate your experience with ${escapeHtml(d.otherPartyName || 'the other party')}.</p><div style="text-align: center; font-size: 28px; letter-spacing: 4px; color: #d97706;">☆ ☆ ☆ ☆ ☆</div>${buildCtaButton(dealUrl(d.dealSlug), 'Leave a Rating', 'primary')}` },
  revision_requested: { subject: (d) => `Revision requested — ${escapeHtml(d.dealTitle)} (${d.revisionNumber || 1}/3)`, accent: '#0d9488', body: (d) => `<h2 style="margin: 0 0 10px 0; color: #0f172a;">Revision Requested</h2><div style="display:inline-block; background:#f0fdfa; color:#0d9488; border-radius:999px; padding:6px 10px; font-size:12px; font-weight:700;">Revision ${d.revisionNumber || 1} of 3</div>${d.notes ? `<div style="background: #f8fafc; border-left: 3px solid #0d9488; padding: 14px 18px; margin-top: 12px; color: #334155;">${escapeHtml(d.notes)}</div>` : ''}<p style="color: #64748b;">Countdown paused.</p>${buildCtaButton(dealUrl(d.dealSlug), 'View Details', 'primary')}` },
  rating_reminder: { subject: (d) => `How was working with ${escapeHtml(d.otherPartyName || 'them')}?`, accent: '#0d9488', body: (d) => `<div style="text-align:center; font-size: 28px; letter-spacing: 4px; color: #d97706;">☆ ☆ ☆ ☆ ☆</div><p style="color: #475569;">A quick rating helps ${escapeHtml(d.otherPartyName || 'your collaborator')} build their reputation.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Rate Now', 'primary')}` },
  dispute_opened: { subject: (d) => `⚠️ Dispute opened — ${escapeHtml(d.dealTitle)}`, accent: '#dc2626', body: (d) => `<h2 style="margin:0 0 10px 0; color:#dc2626;">Dispute Opened</h2><div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:12px 14px; color:#991b1b;">Funds are frozen.</div><p style="color:#475569;">You have 48 hours to respond.</p>${buildCtaButton(dealUrl(d.dealSlug), 'View Dispute', 'primary')}` },
  dispute_proposal_received: { subject: (d) => `Respond to dispute proposal — ${escapeHtml(d.dealTitle)}`, accent: '#d97706', body: (d) => `<p style="color:#475569;">Other party submitted their proposal. Respond within 48 hours.</p><p style="color:#991b1b;">No response = resolved in their favor.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Respond Now', 'urgent')}` },
  dispute_auto_resolved: { subject: (d) => `Dispute resolved — you reached an agreement on ${escapeHtml(d.dealTitle)}`, accent: '#16a34a', body: (d) => `<h2 style="margin:0 0 10px 0; color:#166534;">Agreement Reached! 🤝</h2>${typeof d.amount === 'number' ? buildHeroAmount(d.amount, undefined, 'released') : ''}<p style="color:#475569;">Proposals matched.</p>${d.isNonResponse ? '<p style="color:#64748b;">Other party didn\'t respond.</p>' : ''}${buildCtaButton(dealUrl(d.dealSlug), 'View Resolution', 'success')}` },
  dispute_negotiation_round: { subject: (d) => `Proposals didn't match — one more round on ${escapeHtml(d.dealTitle)}`, accent: '#d97706', body: (d) => `<p style="color:#475569;">Proposals didn't overlap. One more round.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Adjust Proposal', 'primary')}` },
  dispute_escalated: { subject: (d) => `Dispute escalated to review — ${escapeHtml(d.dealTitle)}`, accent: '#dc2626', body: (d) => `<p style="color:#475569;">A real human will review within 48 hours. No further action needed.</p>${buildCtaButton(dealUrl(d.dealSlug), 'View Dispute', 'primary')}` },
  dispute_resolved: { subject: (d) => `Dispute resolved — ${escapeHtml(d.dealTitle)}`, accent: '#0d9488', body: (d) => `<h2 style="margin:0 0 10px 0; color:#0f172a;">Dispute Resolved</h2><p style="color:#475569;">Check deal page for decision.</p>${buildCtaButton(dealUrl(d.dealSlug), 'View Resolution', 'primary')}` },
  interest_received: { subject: (d) => `${escapeHtml(d.otherPartyName || 'Someone')} is interested in ${escapeHtml(d.dealTitle)}`, accent: '#0d9488', body: (d) => `${personBlock(d)}<p style="color:#475569;">Review their pitch.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Review Pitches', 'primary')}` },
  interest_accepted: { subject: (d) => `You've been selected for ${escapeHtml(d.dealTitle)}!`, accent: '#16a34a', body: (d) => `<h2 style="margin:0 0 10px 0; color:#166534;">You're Selected! 🎉</h2>${typeof d.amount === 'number' ? buildHeroAmount(d.amount, undefined, 'secured') : ''}${buildCtaButton(dealUrl(d.dealSlug), 'View Gig', 'success')}` },
  deal_filled: { subject: (d) => `${escapeHtml(d.dealTitle)} has been filled`, accent: '#64748b', body: () => `<h2 style="margin:0 0 10px 0; color:#0f172a;">Gig Filled</h2><p style="color:#475569;">Client selected someone else.</p>${buildCtaButton(`${APP_URL}/gigs`, 'Browse Gigs', 'neutral')}` },
  milestone_funded: { subject: (d) => `Milestone funded — ${escapeHtml(d.milestoneTitle || 'Milestone')} (${formatAmount(d.amount || 0)})`, accent: '#16a34a', body: (d) => `${buildHeroAmount(d.amount || 0, undefined, 'secured')}<p style="color:#475569;">${formatAmount(d.amount || 0)} secured for milestone ${escapeHtml(d.milestoneTitle || 'milestone')}.</p>${buildCtaButton(dealUrl(d.dealSlug), 'View Milestone', 'primary')}` },
  milestone_approved: { subject: (d) => `✅ ${formatAmount(d.amount || 0)} released — ${escapeHtml(d.milestoneTitle || 'Milestone')} approved`, accent: '#16a34a', body: (d) => `${buildHeroAmount(d.amount || 0, undefined, 'milestone')}<p style="color:#475569;">Client approved.</p>${buildCtaButton(dealUrl(d.dealSlug), 'View Gig', 'success')}` },
  milestone_proposed: { subject: (d) => `Milestone change proposed — ${escapeHtml(d.dealTitle)}`, accent: '#0d9488', body: (d) => `<p style="color:#475569;">A milestone update was proposed for this gig.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Review Proposal', 'primary')}` },
  milestone_change_approved: { subject: (d) => `Milestone change approved — ${escapeHtml(d.dealTitle)}`, accent: '#0d9488', body: (d) => `<p style="color:#475569;">Milestone change approved.</p>${buildCtaButton(dealUrl(d.dealSlug), 'View Gig', 'primary')}` },
  deal_cancelled: { subject: (d) => `Gig cancelled — ${escapeHtml(d.dealTitle)}`, accent: '#64748b', body: (d) => `<h2 style="margin:0 0 10px 0; color:#0f172a;">Gig Cancelled</h2>${typeof d.refundAmount === 'number' ? buildHeroAmount(d.refundAmount, undefined, 'refund') : ''}<p style="color:#64748b;">Refund processing typically takes 5-10 business days.</p>${buildCtaButton(`${APP_URL}/post`, 'Post a New Gig', 'neutral')}` },
  deal_cancelled_to_freelancer: { subject: (d) => `Gig cancelled — ${escapeHtml(d.dealTitle)}`, accent: '#64748b', body: (d) => `<h2 style="margin:0 0 10px 0; color:#0f172a;">Gig Cancelled</h2><p style="color:#475569;">No evidence submitted, full refund to client.</p><p style="color:#64748b;">Doesn't affect your reputation.</p>${buildCtaButton(`${APP_URL}/gigs`, 'Browse Gigs', 'neutral')}` },
  auto_expire_warning_14d: { subject: (d) => `Your gig has been waiting 2 weeks — ${escapeHtml(d.dealTitle)}`, accent: '#d97706', body: (d) => `<p style="color:#475569;">Funded 2 weeks, no one accepted. Auto-refund in 16 days.</p>${buildCtaButton(dealUrl(d.dealSlug), 'View Gig', 'primary')}<p style="margin-top:12px;"><a href="${dealUrl(d.dealSlug)}" style="color:#d97706;">Cancel & Refund Now</a></p>` },
  auto_expire_warning_27d: { subject: (d) => `Final notice — ${escapeHtml(d.dealTitle)} auto-refunds in 3 days`, accent: '#dc2626', body: (d) => `${buildCountdownBlock(72)}<p style="color:#475569;">Final notice. Auto-refund in 3 days.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Cancel & Refund Now', 'urgent')}<p style="margin-top:12px;"><a href="${dealUrl(d.dealSlug)}" style="color:#475569;">Keep Active</a></p>` },
  auto_expire_completed: { subject: (d) => `Auto-refund processed — ${formatAmount(d.amount || 0)} for ${escapeHtml(d.dealTitle)}`, accent: '#64748b', body: (d) => `${buildHeroAmount(d.amount || 0, undefined, 'refund')}<p style="color:#475569;">Nobody accepted within 30 days. Refund processing.</p>${buildCtaButton(`${APP_URL}/post`, 'Post a New Gig', 'neutral')}` },
  freelancer_ghost_nudge_7d: { subject: (d) => `Reminder: upload your progress on ${escapeHtml(d.dealTitle)}`, accent: '#d97706', body: (d) => `<p style="color:#475569;">Accepted 7 days ago. Upload evidence.</p><p style="color:#64748b;">Client may cancel if no evidence.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Upload Evidence', 'primary')}` },
  freelancer_ghost_warning_14d: { subject: (d) => `No progress on ${escapeHtml(d.dealTitle)} — you can cancel for a full refund`, accent: '#d97706', body: (d) => `<p style="color:#475569;">No evidence in 14 days. You can cancel.</p>${buildCtaButton(dealUrl(d.dealSlug), 'Cancel & Refund', 'urgent')}<p style="margin-top:12px;"><a href="${dealUrl(d.dealSlug)}" style="color:#475569;">View Gig</a></p>` },
  guest_deal_invite: { subject: (d) => `You've been invited to a gig — ${formatAmount(d.amount || 0)}`, accent: '#16a34a', body: (d) => `${buildHeroAmount(d.amount || 0, undefined, 'secured')}<p style="color:#475569;">Someone wants to hire you. No account needed.</p><div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;"><a href="${dealUrl(d.dealSlug)}" style="color: #0d9488; font-size: 14px; word-break: break-all;">${dealUrl(d.dealSlug)}</a></div>${buildCtaButton(dealUrl(d.dealSlug), 'View & Accept', 'success')}` },
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
  const html = buildEmailHtml({ body: bodyHtml, accentColor: config.accent });

  return sendEmail({
    to: params.to,
    subject,
    html,
  });
}
