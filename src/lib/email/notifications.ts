import { sendEmail } from "./send";
import type { NotificationType, NotificationData } from "@/types/database";

export type { NotificationData };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://checkhire.co";

// ── Security: sanitize ALL user-provided data before HTML interpolation ──

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Consistent money display (cents → $X.XX) ──

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

// ── Base HTML layout that wraps EVERY email ──

function buildEmailHtml(options: {
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
  </td></tr>
  <!-- Divider -->
  <tr><td style="padding: 0 32px;"><div style="height: 1px; background-color: #f1f5f9;"></div></td></tr>
  <!-- Body -->
  <tr><td style="padding: 24px 32px 32px 32px; font-size: 14px; color: #475569; line-height: 1.6;">
    ${options.body}
  </td></tr>
  <!-- Footer inside card -->
  <tr><td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #94a3b8;">CheckHire — Secure escrow for gig work</p>
    <p style="margin: 4px 0 0 0; font-size: 12px;"><a href="${APP_URL}" style="color: #94a3b8; text-decoration: underline;">checkhire.co</a></p>
  </td></tr>
</table>

<!-- Below-card text -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px;">
  <tr><td style="padding: 16px 32px; text-align: center;">
    <p style="margin: 0; font-size: 11px; color: #94a3b8;">You received this email because of activity on your CheckHire gig.</p>
    <p style="margin: 4px 0 0 0; font-size: 11px;"><a href="${APP_URL}/settings" style="color: #94a3b8; text-decoration: underline;">Manage notifications</a></p>
  </td></tr>
</table>

</td></tr>
</table>
</body>
</html>`;
}

// ── CTA Button ──

function buildCtaButton(
  href: string,
  label: string,
  variant?: "primary" | "urgent" | "success" | "neutral" | "brand"
): string {
  const colors: Record<string, string> = {
    primary: "#0d9488",
    urgent: "#d97706",
    success: "#16a34a",
    neutral: "#475569",
    brand: "#0d9488",
  };
  const bgColor = colors[variant || "primary"] || variant || "#0d9488";
  return buildCtaButtonRaw(href, label, bgColor);
}

function buildCtaButtonRaw(
  href: string,
  label: string,
  bgColor: string
): string {
  return `<div style="margin: 24px 0 8px 0;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color: ${bgColor}; border-radius: 8px;">
  <a href="${href}" style="display: inline-block; padding: 14px 32px; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none;">${label}</a>
</td></tr></table>
</div>`;
}

function buildReferralNudge(): string {
  return `<div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
<p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600;">Share CheckHire, earn on every deal</p>
<p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Know someone who does freelance work? Share your referral link and earn 20% of our platform fee on every deal they make for 12 months. Check your referral link in <a href="${APP_URL}/settings" style="color: #0d9488; text-decoration: underline;">Settings</a>.</p>
</div>`;
}

// ── Hero Amount Display ──

type HeroVariant =
  | "secured"
  | "released"
  | "milestone"
  | "refund"
  | "auto_released";

function buildHeroAmount(amountCents: number, variant: HeroVariant): string {
  const config: Record<
    HeroVariant,
    { icon: string; color: string; bg: string; label: string }
  > = {
    secured: {
      icon: "🔒",
      color: "#0d9488",
      bg: "#f0fdfa",
      label: "Held securely in escrow",
    },
    released: {
      icon: "✅",
      color: "#16a34a",
      bg: "#f0fdf4",
      label: "Released to your bank",
    },
    milestone: {
      icon: "✅",
      color: "#16a34a",
      bg: "#f0fdf4",
      label: "Milestone payment released",
    },
    refund: {
      icon: "↩️",
      color: "#64748b",
      bg: "#f8fafc",
      label: "Refund processing — 5-10 business days",
    },
    auto_released: {
      icon: "⚡",
      color: "#16a34a",
      bg: "#f0fdf4",
      label: "Auto-released — 72hr review expired",
    },
  };

  const c = config[variant];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color: ${c.bg}; border-radius: 12px; padding: 24px 16px; text-align: center;">
  <div style="font-size: 32px; line-height: 1;">${c.icon}</div>
  <div style="font-size: 36px; font-weight: 700; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace, -apple-system, sans-serif; letter-spacing: -0.5px; color: ${c.color}; margin: 8px 0;">${formatAmount(amountCents)}</div>
  <div style="font-size: 14px; color: #475569; font-weight: 500;">${c.label}</div>
</td></tr></table>
</td></tr></table>`;
}

// ── Countdown Block ──

function buildCountdownBlock(hours: number): string {
  let bg: string, border: string, text: string, subtext: string;
  if (hours <= 6) {
    bg = "#fef2f2";
    border = "#fecaca";
    text = "#dc2626";
    subtext = "#991b1b";
  } else if (hours <= 24) {
    bg = "#fffbeb";
    border = "#fde68a";
    text = "#d97706";
    subtext = "#92400e";
  } else {
    bg = "#f0fdfa";
    border = "#99f6e4";
    text = "#0d9488";
    subtext = "#475569";
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color: ${bg}; border: 1px solid ${border}; border-radius: 12px; padding: 20px 16px; text-align: center;">
  <div style="font-size: 42px; font-weight: 700; font-family: monospace; letter-spacing: 2px; color: ${text};">${hours}:00:00</div>
  <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; color: ${subtext}; margin-top: 4px;">HOURS REMAINING</div>
</td></tr></table>
</td></tr></table>`;
}

// ── Verification Code Block ──

function buildVerificationCodeBlock(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px 16px; text-align: center;">
  <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: monospace; color: #0f172a;">${escapeHtml(code)}</div>
  <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-top: 8px;">Expires in 15 minutes</div>
</td></tr></table>
</td></tr></table>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION CONFIG — Templates 1-18
// ══════════════════════════════════════════════════════════════════════════════

type NotificationConfig = {
  subject: (data: NotificationData) => string;
  accent: string;
  body: (data: NotificationData) => string;
};

function dealUrl(slug: string): string {
  return `${APP_URL}/deal/${slug}`;
}

const NOTIFICATION_CONFIG: Record<string, NotificationConfig> = {
  // ── Template 1: guest_verification_code ──
  guest_verification_code: {
    accent: "#0d9488",
    subject: () => "Your CheckHire verification code",
    body: (data) => {
      const code = data.verificationCode || data.code || "------";
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Verify your email</h2>` +
        buildVerificationCodeBlock(code) +
        `<p style="margin: 16px 0 0 0; font-size: 14px; color: #475569;">Enter this code on the deal page to accept the gig.</p>` +
        `<p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8;">If you didn't request this, you can safely ignore this email.</p>`
      );
    },
  },

  // ── Template 2: deal_created ──
  deal_created: {
    accent: "#0d9488",
    subject: () => "Your gig is live — share your payment link",
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      const amountLine = data.amount
        ? `<p style="margin: 16px 0 0 0; font-size: 14px; color: #0f172a;">Budget: <strong>${formatAmount(data.amount)}</strong></p>`
        : "";
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Your Gig is Live</h2>` +
        `<p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">Your gig <strong>${title}</strong> is ready to share. Send your payment link to find a freelancer.</p>` +
        `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; text-align: center;">` +
        `<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600; margin-bottom: 4px;">YOUR PAYMENT LINK</div>` +
        `<a href="${link}" style="font-size: 14px; color: #0d9488; text-decoration: none; word-break: break-all;">${link}</a>` +
        `</div>` +
        amountLine +
        buildCtaButton(link, "View Your Gig", "primary")
      );
    },
  },

  // ── Template 3: deal_accepted ──
  deal_accepted: {
    accent: "#0d9488",
    subject: (data) =>
      `${escapeHtml(data.otherPartyName || "Someone")} accepted your gig — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const name = escapeHtml(data.otherPartyName || "A freelancer");
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      const initialsHtml = data.initials
        ? `<div style="display: inline-block; width: 40px; height: 40px; background-color: #f0fdfa; color: #0d9488; font-weight: 600; text-align: center; line-height: 40px; border-radius: 50%; font-size: 14px; margin-bottom: 8px;">${escapeHtml(data.initials)}</div><br>`
        : "";
      const statusText = data.escrowFunded
        ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #475569;">The deal is live — check in on progress anytime.</p>`
        : `<p style="margin: 12px 0 0 0; font-size: 14px; color: #475569;">Fund escrow to secure the deal and get started.</p>`;
      const ctaLabel = data.escrowFunded ? "View Deal" : "Fund Escrow";
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Gig Accepted</h2>` +
        initialsHtml +
        `<p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600;">${name}</p>` +
        statusText +
        buildCtaButton(link, ctaLabel, "primary")
      );
    },
  },

  // ── Template 4: deal_accepted_escrow_pending ──
  deal_accepted_escrow_pending: {
    accent: "#0d9488",
    subject: (data) =>
      `You accepted ${escapeHtml(data.dealTitle)} — waiting for payment`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">You're In</h2>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">You accepted <strong>${title}</strong>. The client hasn't funded escrow yet — we'll notify you as soon as the payment is secured.</p>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">Once payment is locked, you'll see the exact amount on the deal page and can start working.</p>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">No payment means no obligation. If the client doesn't fund escrow, you're free to walk away.</p>` +
        buildCtaButton(link, "View Deal", "primary")
      );
    },
  },

  // ── Template 6: escrow_funded_after_accept (same as escrow_funded) ──
  escrow_funded_after_accept: {
    accent: "#16a34a",
    subject: (data) =>
      `💰 ${formatAmount(data.amount!)} secured — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      return (
        buildHeroAmount(data.amount!, "secured") +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">The client has funded escrow for <strong>${title}</strong>. The money is real and waiting for you. Start working and upload evidence of your progress — it protects you if there's ever a dispute.</p>` +
        buildCtaButton(link, "Start Working", "success")
      );
    },
  },

  // ── Template: payment_confirmed (client receipt) ──
  payment_confirmed: {
    accent: "#0d9488",
    subject: (data) =>
      `Payment confirmed — ${formatAmount(data.amount!)} secured for ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const amount = formatAmount(data.amount!);
      const link = dealUrl(data.dealSlug);
      return (
        buildHeroAmount(data.amount!, "secured") +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">Your payment of <strong>${amount}</strong> for <strong>${title}</strong> has been processed and is now held securely in escrow.</p>` +
        `<div style="margin: 16px 0; padding: 12px 16px; background-color: #f8fafc; border-radius: 8px;">` +
        `<p style="margin: 0 0 8px 0; font-size: 13px; color: #0f172a; font-weight: 600;">What happens next:</p>` +
        `<p style="margin: 0 0 4px 0; font-size: 13px; color: #475569;">1. Your freelancer will be notified that payment is secured</p>` +
        `<p style="margin: 0 0 4px 0; font-size: 13px; color: #475569;">2. They'll start working and upload evidence of progress</p>` +
        `<p style="margin: 0; font-size: 13px; color: #475569;">3. When work is submitted, you'll have 72 hours to review</p>` +
        `</div>` +
        `<p style="margin: 16px 0 0 0; font-size: 13px; color: #475569;">Your funds are held securely by Stripe — CheckHire never touches your money. You can cancel for a full refund at any time before a freelancer accepts. Once a freelancer accepts, you have 24 hours to cancel if something doesn't feel right. After that, funds are locked until work is delivered, ensuring your freelancer can work with confidence.</p>` +
        `<p style="margin: 12px 0 0 0; font-size: 13px; color: #475569;">If there's ever a problem, our dispute process has a real human review every case within 48 hours. If no one accepts within 30 days, your funds are automatically refunded.</p>` +
        buildCtaButton(link, "View Deal", "primary")
      );
    },
  },

  // ── Template 7: work_submitted ──
  work_submitted: {
    accent: "#d97706",
    subject: () => "⏰ Work submitted — review within 72 hours",
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const amount = formatAmount(data.amount!);
      const link = dealUrl(data.dealSlug);
      return (
        buildCountdownBlock(72) +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">Your freelancer submitted work on <strong>${title}</strong> (${amount}). You have <strong>72 hours</strong> to:</p>` +
        `<div style="margin: 16px 0;">` +
        `<div style="padding: 8px 0; font-size: 14px; color: #0f172a;">✅ <strong>Confirm delivery</strong> — release funds to the freelancer</div>` +
        `<div style="padding: 8px 0; font-size: 14px; color: #0f172a;">✏️ <strong>Request revision</strong> — pause the countdown, ask for changes</div>` +
        `<div style="padding: 8px 0; font-size: 14px; color: #0f172a;">⚠️ <strong>Open dispute</strong> — freeze funds, submit your case</div>` +
        `</div>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">If you don't respond, funds auto-release to the freelancer.</p>` +
        buildCtaButton(link, "Review Now", "urgent")
      );
    },
  },

  // ── Template 8: auto_release_warning_24h ──
  auto_release_warning_24h: {
    accent: "#d97706",
    subject: (data) =>
      `⚠️ 24 hours left — ${formatAmount(data.amount!)} releases tomorrow`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const amount = formatAmount(data.amount!);
      const link = dealUrl(data.dealSlug);
      return (
        buildCountdownBlock(24) +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">You have <strong>24 hours</strong> left to review the work on <strong>${title}</strong>. If you don't respond, ${amount} will automatically release to the freelancer.</p>` +
        buildCtaButton(link, "Review Now", "urgent")
      );
    },
  },

  // ── Template 9: auto_release_warning_6h ──
  auto_release_warning_6h: {
    accent: "#dc2626",
    subject: (data) =>
      `🚨 6 hours — ${formatAmount(data.amount!)} auto-releases soon`,
    body: (data) => {
      const amount = formatAmount(data.amount!);
      const link = dealUrl(data.dealSlug);
      return (
        buildCountdownBlock(6) +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;"><strong>Final notice.</strong> You have <strong>6 hours</strong> left. After the deadline, ${amount} releases automatically.</p>` +
        buildCtaButtonRaw(link, "Review Now", "#dc2626")
      );
    },
  },

  // ── Template 10: auto_release_completed ──
  auto_release_completed: {
    accent: "#16a34a",
    subject: (data) => {
      if (data.role === "freelancer") {
        return `🎉 ${formatAmount(data.amount!)} released — check your bank`;
      }
      return `Funds auto-released — ${escapeHtml(data.dealTitle)}`;
    },
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const amount = formatAmount(data.amount!);
      const link = dealUrl(data.dealSlug);

      if (data.role === "freelancer") {
        const accountNudge = data.isGuestFreelancer
          ? `<div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 14px 18px; margin: 20px 0;"><p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600;">Build your reputation</p><p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Create a free CheckHire account to track your gigs, earn trust badges, and get hired faster.</p></div>`
          : "";
        return (
          buildHeroAmount(data.amount!, "auto_released") +
          `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">The 72-hour review period expired on <strong>${title}</strong>. ${amount} has been released to your bank account.</p>` +
          `<p style="margin: 12px 0 0 0; font-size: 14px; color: #475569;">Want it faster next time? Use <strong>Instant Payout</strong> to get your money in minutes.</p>` +
          accountNudge +
          (data.isGuestFreelancer ? "" : buildReferralNudge()) +
          buildCtaButton(link, "View Payout", "success")
        );
      }

      // Client variant
      return (
        buildHeroAmount(data.amount!, "auto_released") +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">The review period for <strong>${title}</strong> has expired. ${amount} has been released to the freelancer.</p>` +
        buildCtaButton(link, "View Gig", "neutral")
      );
    },
  },

  // ── Template 11: funds_released ──
  funds_released: {
    accent: "#16a34a",
    subject: (data) =>
      `🎉 ${formatAmount(data.amount!)} released — check your bank`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const amount = formatAmount(data.amount!);
      const link = dealUrl(data.dealSlug);
      const accountNudge = data.isGuestFreelancer
        ? `<div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 14px 18px; margin: 20px 0;"><p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 600;">Build your reputation</p><p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Create a free CheckHire account to track your gigs, earn trust badges, and get hired faster.</p></div>`
        : "";
      return (
        buildHeroAmount(data.amount!, "released") +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">The client confirmed delivery on <strong>${title}</strong>. ${amount} has been released to your bank account.</p>` +
        `<p style="margin: 12px 0 0 0; font-size: 14px; color: #475569;">Standard payouts arrive in 2 business days. Want it faster? Use <strong>Instant Payout</strong> to get your money in seconds.</p>` +
        accountNudge +
        (data.isGuestFreelancer ? "" : buildReferralNudge()) +
        buildCtaButton(link, "View Payout", "success")
      );
    },
  },

  // ── Template 12: deal_completed ──
  deal_completed: {
    accent: "#16a34a",
    subject: (data) =>
      `Gig complete — leave a rating for ${escapeHtml(data.otherPartyName || "your freelancer")}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const name = escapeHtml(data.otherPartyName || "your freelancer");
      const link = dealUrl(data.dealSlug);
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Gig Complete! 🎉</h2>` +
        `<p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;"><strong>${title}</strong> is done. Take 30 seconds to rate your experience with <strong>${name}</strong>. Ratings build trust for everyone.</p>` +
        `<div style="text-align: center; margin: 20px 0; font-size: 28px; letter-spacing: 4px; color: #d97706;">☆ ☆ ☆ ☆ ☆</div>` +
        buildCtaButton(link, "Leave a Rating", "primary")
      );
    },
  },

  // ── Template 13: revision_requested ──
  revision_requested: {
    accent: "#0d9488",
    subject: (data) =>
      `Revision requested — ${escapeHtml(data.dealTitle)} (${data.revisionNumber || 1}/3)`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const n = data.revisionNumber || 1;
      const link = dealUrl(data.dealSlug);
      const notesHtml = data.notes
        ? `<div style="background: #f8fafc; border-left: 3px solid #0d9488; padding: 14px 18px; margin: 16px 0; border-radius: 0 8px 8px 0;"><p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6;">${escapeHtml(data.notes)}</p></div>`
        : "";
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Revision Requested</h2>` +
        `<p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #64748b;">Revision ${n} of 3</p>` +
        notesHtml +
        `<p style="margin: 16px 0 0 0; font-size: 14px; color: #475569;">The 72-hour countdown is paused until you resubmit.</p>` +
        buildCtaButton(link, "View Details", "primary")
      );
    },
  },

  // ── Template 14: rating_reminder ──
  rating_reminder: {
    accent: "#0d9488",
    subject: (data) =>
      `How was working with ${escapeHtml(data.otherPartyName || "them")}?`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const name = escapeHtml(data.otherPartyName || "them");
      const link = dealUrl(data.dealSlug);
      return (
        `<div style="text-align: center; margin: 0 0 20px 0; font-size: 28px; letter-spacing: 4px; color: #d97706;">☆ ☆ ☆ ☆ ☆</div>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">Your gig <strong>${title}</strong> is complete. A quick rating helps <strong>${name}</strong> build their reputation — and helps future clients make better decisions.</p>` +
        buildCtaButton(link, "Rate Now", "primary")
      );
    },
  },

  // ── Template 15: dispute_opened ──
  dispute_opened: {
    accent: "#dc2626",
    subject: (data) =>
      `⚠️ Dispute opened — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const name = escapeHtml(data.otherPartyName || "The other party");
      const link = dealUrl(data.dealSlug);
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #991b1b;">Dispute Opened</h2>` +
        `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 18px; margin: 16px 0;"><p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">Funds are frozen until this is resolved.</p></div>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">${name} opened a dispute on <strong>${title}</strong>. You have 48 hours to submit your evidence and counter-proposal.</p>` +
        buildCtaButton(link, "View Dispute", "primary")
      );
    },
  },

  // ── Template 16: dispute_proposal_received ──
  dispute_proposal_received: {
    accent: "#d97706",
    subject: (data) =>
      `Respond to dispute proposal — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      return (
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">The other party submitted their proposal for the dispute on <strong>${title}</strong>. Review their evidence and submit your counter-proposal within 48 hours.</p>` +
        `<p style="margin: 0; font-size: 14px; color: #d97706; font-weight: 600;">If you don't respond within the deadline, the dispute will be resolved based on the other party's proposal.</p>` +
        buildCtaButton(link, "Respond Now", "urgent")
      );
    },
  },

  // ── Template 17: dispute_auto_resolved ──
  dispute_auto_resolved: {
    accent: "#16a34a",
    subject: (data) =>
      `Dispute resolved — you reached an agreement on ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      const heroHtml = data.amount
        ? buildHeroAmount(data.amount, "released")
        : "";
      const nonResponseNote = data.isNonResponse
        ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #475569;">The other party did not respond within the deadline. The dispute was resolved based on the submitted proposal.</p>`
        : "";
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Agreement Reached! 🤝</h2>` +
        heroHtml +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">Both parties' proposals matched on <strong>${title}</strong>. The dispute has been automatically resolved.</p>` +
        nonResponseNote +
        buildCtaButton(link, "View Resolution", "success")
      );
    },
  },

  // ── Template 18: dispute_negotiation_round ──
  dispute_negotiation_round: {
    accent: "#d97706",
    subject: (data) =>
      `Proposals didn't match — one more round on ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      return (
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">Your proposals on <strong>${title}</strong> didn't overlap. You have one more round to adjust your offer. If proposals still don't match, the dispute will be escalated to human review.</p>` +
        buildCtaButton(link, "Adjust Proposal", "primary")
      );
    },
  },

  // ── Template 19: dispute_escalated ──
  dispute_escalated: {
    accent: "#dc2626",
    subject: (data) =>
      `Dispute escalated to review — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      return (
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">Proposals on <strong>${title}</strong> couldn't reach agreement after two rounds. A real human will review your case and all evidence within 48 hours.</p>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">Both parties' evidence and proposals have been submitted. No further action is needed from you unless the reviewer requests additional information.</p>` +
        buildCtaButton(link, "View Dispute", "primary")
      );
    },
  },

  // ── Template 20: dispute_resolved ──
  dispute_resolved: {
    accent: "#0d9488",
    subject: (data) =>
      `Dispute resolved — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Dispute Resolved</h2>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">The dispute on <strong>${title}</strong> has been resolved. Check the deal page for the decision, amounts, and next steps.</p>` +
        buildCtaButton(link, "View Resolution", "primary")
      );
    },
  },

  // ── Template 21: interest_received ──
  interest_received: {
    accent: "#0d9488",
    subject: (data) =>
      `${escapeHtml(data.otherPartyName || "Someone")} applied to ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const name = escapeHtml(data.otherPartyName || "Someone");
      const link = dealUrl(data.dealSlug);
      const initialsHtml = data.initials
        ? `<div style="display: inline-block; width: 40px; height: 40px; background-color: #f0fdfa; color: #0d9488; font-weight: 600; text-align: center; line-height: 40px; border-radius: 50%; font-size: 16px; margin-bottom: 8px;">${escapeHtml(data.initials)}</div><br>`
        : "";
      const pitchHtml = data.notes
        ? `<div style="margin: 16px 0; padding: 12px 16px; background-color: #f8fafc; border-left: 3px solid #0d9488; border-radius: 4px;"><p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #0f172a;">Their message:</p><p style="margin: 0; font-size: 14px; color: #475569; white-space: pre-wrap;">${escapeHtml(data.notes).slice(0, 500)}</p></div>`
        : "";
      return (
        initialsHtml +
        `<p style="margin: 0 0 4px 0; font-size: 14px; color: #475569;"><strong>${name}</strong> applied to <strong>${title}</strong>.</p>` +
        pitchHtml +
        buildCtaButton(link, "View Application", "primary")
      );
    },
  },

  // ── Template 22: interest_accepted ──
  interest_accepted: {
    accent: "#16a34a",
    subject: (data) =>
      `You've been selected for ${escapeHtml(data.dealTitle)}!`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      const heroHtml = data.amount
        ? buildHeroAmount(data.amount, "secured")
        : "";
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">You're Selected! 🎉</h2>` +
        heroHtml +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">Great news — the client chose you for <strong>${title}</strong>. Review the deal terms and get started.</p>` +
        buildCtaButton(link, "View Gig", "success")
      );
    },
  },

  // ── Template 23: deal_filled ──
  deal_filled: {
    accent: "#64748b",
    subject: (data) =>
      `${escapeHtml(data.dealTitle)} has been filled`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Gig Filled</h2>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">The client selected someone else for <strong>${title}</strong>. Keep browsing for other opportunities.</p>` +
        buildCtaButton(`${APP_URL}/gigs`, "Browse Gigs", "neutral")
      );
    },
  },

  // ── Template 24: milestone_funded ──
  milestone_funded: {
    accent: "#16a34a",
    subject: (data) =>
      `Milestone funded — ${escapeHtml(data.milestoneTitle || "Milestone")} (${formatAmount(data.amount!)})`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const msTitle = escapeHtml(data.milestoneTitle || "Milestone");
      const amount = formatAmount(data.amount!);
      const link = dealUrl(data.dealSlug);
      return (
        buildHeroAmount(data.amount!, "secured") +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">${amount} has been secured for milestone <strong>${msTitle}</strong> on <strong>${title}</strong>.</p>` +
        buildCtaButton(link, "View Milestone", "primary")
      );
    },
  },

  // ── Template 25: milestone_approved ──
  milestone_approved: {
    accent: "#16a34a",
    subject: (data) =>
      `✅ ${formatAmount(data.amount!)} released — ${escapeHtml(data.milestoneTitle || "Milestone")} approved`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const msTitle = escapeHtml(data.milestoneTitle || "Milestone");
      const amount = formatAmount(data.amount!);
      const link = dealUrl(data.dealSlug);
      return (
        buildHeroAmount(data.amount!, "milestone") +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">The client approved <strong>${msTitle}</strong> on <strong>${title}</strong>. ${amount} has been released.</p>` +
        buildCtaButton(link, "View Gig", "success")
      );
    },
  },

  // ── Template 26: milestone_proposed ──
  milestone_proposed: {
    accent: "#0d9488",
    subject: (data) =>
      `Milestone change proposed — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      return (
        `<p style="margin: 0; font-size: 14px; color: #475569;">A milestone change has been proposed on <strong>${title}</strong>. Review the details and approve or discuss.</p>` +
        buildCtaButton(link, "Review Proposal", "primary")
      );
    },
  },

  // ── Template 27: milestone_change_approved ──
  milestone_change_approved: {
    accent: "#0d9488",
    subject: (data) =>
      `Milestone change approved — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      return (
        `<p style="margin: 0; font-size: 14px; color: #475569;">The milestone change on <strong>${title}</strong> has been approved. Check the updated terms.</p>` +
        buildCtaButton(link, "View Gig", "primary")
      );
    },
  },

  // ── Template 28: deal_cancelled ──
  deal_cancelled: {
    accent: "#64748b",
    subject: (data) =>
      `Gig cancelled — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const refundCents = data.refundAmount || data.amount;
      const heroHtml = refundCents
        ? buildHeroAmount(refundCents, "refund")
        : "";
      const refundNote = refundCents
        ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #475569;">Your refund typically takes 5-10 business days to process.</p>`
        : "";
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Gig Cancelled</h2>` +
        heroHtml +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">The gig <strong>${title}</strong> has been cancelled.</p>` +
        refundNote +
        buildCtaButton(`${APP_URL}/deal/new`, "Post a New Gig", "neutral")
      );
    },
  },

  // ── Template 29: deal_cancelled_to_freelancer ──
  deal_cancelled_to_freelancer: {
    accent: "#64748b",
    subject: (data) =>
      `Gig cancelled — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Gig Cancelled</h2>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">The client cancelled <strong>${title}</strong>. No work evidence was submitted, so a full refund was processed to the client.</p>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">This doesn't affect your reputation. Browse other gigs to find your next opportunity.</p>` +
        buildCtaButton(`${APP_URL}/gigs`, "Browse Gigs", "neutral")
      );
    },
  },

  // ── Template 30: auto_expire_warning_14d ──
  auto_expire_warning_14d: {
    accent: "#d97706",
    subject: (data) =>
      `Your gig has been waiting 2 weeks — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      return (
        `<p style="margin: 0; font-size: 14px; color: #475569;">Your gig <strong>${title}</strong> has been funded for 2 weeks and nobody has accepted it yet. Your escrow will auto-refund in 16 days if no one accepts.</p>` +
        buildCtaButton(link, "View Gig", "primary") +
        `<p style="margin: 12px 0 0 0; font-size: 13px; text-align: center;"><a href="${link}" style="color: #64748b; text-decoration: underline;">Cancel &amp; Refund Now</a></p>`
      );
    },
  },

  // ── Template 31: auto_expire_warning_27d ──
  auto_expire_warning_27d: {
    accent: "#dc2626",
    subject: (data) =>
      `Final notice — ${escapeHtml(data.dealTitle)} auto-refunds in 3 days`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const amount = data.amount ? formatAmount(data.amount) : "";
      const link = dealUrl(data.dealSlug);
      return (
        buildCountdownBlock(72) +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;"><strong>Final notice.</strong> Nobody has accepted <strong>${title}</strong>. Your ${amount} will be automatically refunded in 3 days.</p>` +
        buildCtaButton(link, "Cancel & Refund Now", "urgent") +
        `<p style="margin: 12px 0 0 0; font-size: 13px; text-align: center;"><a href="${link}" style="color: #64748b; text-decoration: underline;">Keep Active</a></p>`
      );
    },
  },

  // ── Template 32: auto_expire_completed ──
  auto_expire_completed: {
    accent: "#64748b",
    subject: (data) =>
      `Auto-refund processed — ${formatAmount(data.amount!)} for ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const amount = formatAmount(data.amount!);
      return (
        buildHeroAmount(data.amount!, "refund") +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">Nobody accepted your gig <strong>${title}</strong> within 30 days. ${amount} has been automatically refunded to your original payment method. Refunds typically take 5-10 business days.</p>` +
        buildCtaButton(`${APP_URL}/deal/new`, "Post a New Gig", "neutral")
      );
    },
  },

  // ── Template 33: freelancer_ghost_nudge_7d ──
  freelancer_ghost_nudge_7d: {
    accent: "#d97706",
    subject: (data) =>
      `Reminder: upload your progress on ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      return (
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">You accepted <strong>${title}</strong> 7 days ago. Please upload evidence of your work progress. This protects you in case of disputes, and keeps the client informed.</p>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">The client may cancel for a full refund if no work evidence is submitted.</p>` +
        buildCtaButton(link, "Upload Evidence", "primary")
      );
    },
  },

  // ── Template 34: freelancer_ghost_warning_14d ──
  freelancer_ghost_warning_14d: {
    accent: "#d97706",
    subject: (data) =>
      `No progress on ${escapeHtml(data.dealTitle)} — you can cancel for a full refund`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      return (
        `<p style="margin: 0; font-size: 14px; color: #475569;">Your freelancer hasn't submitted any work evidence on <strong>${title}</strong> in 14 days. You have the option to cancel for a full refund.</p>` +
        buildCtaButton(link, "Cancel & Refund", "urgent") +
        `<p style="margin: 12px 0 0 0; font-size: 13px; text-align: center;"><a href="${link}" style="color: #64748b; text-decoration: underline;">View Gig</a></p>`
      );
    },
  },

  // ── Template 35: guest_deal_invite ──
  guest_deal_invite: {
    accent: "#16a34a",
    subject: (data) =>
      `You've been invited to a gig — ${formatAmount(data.amount!)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const amount = formatAmount(data.amount!);
      const link = dealUrl(data.dealSlug);
      return (
        buildHeroAmount(data.amount!, "secured") +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">Someone wants to hire you for <strong>${title}</strong>. ${amount} is secured in escrow — the money is real and waiting for you. No account needed to get started.</p>` +
        `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; text-align: center; margin: 16px 0;">` +
        `<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600; margin-bottom: 4px;">YOUR GIG LINK</div>` +
        `<a href="${link}" style="font-size: 14px; color: #0d9488; text-decoration: none; word-break: break-all;">${link}</a>` +
        `</div>` +
        buildCtaButton(link, "View & Accept", "success")
      );
    },
  },

  // ── Template 36: checkout_expired ──
  checkout_expired: {
    accent: "#d97706",
    subject: (data) =>
      `Your escrow payment didn't go through — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Payment Not Completed</h2>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">Your escrow payment for <strong>${title}</strong> wasn't completed. The checkout session expired. No money was charged.</p>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">If you still want to fund this gig, click below to try again.</p>` +
        buildCtaButton(link, "Try Again", "primary")
      );
    },
  },

  // ── Template 37: payment_failed_async ──
  payment_failed_async: {
    accent: "#dc2626",
    subject: (data) =>
      `⚠️ Bank transfer failed — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const reason = data.failureReason ? escapeHtml(data.failureReason) : "insufficient funds or bank rejection";
      const link = dealUrl(data.dealSlug);
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #991b1b;">Payment Failed</h2>` +
        `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 18px; margin: 16px 0;"><p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">Escrow is no longer funded for this gig.</p></div>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">Your bank transfer for <strong>${title}</strong> was declined. Reason: ${reason}.</p>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">The escrow has been reverted. Please try funding with a different payment method.</p>` +
        buildCtaButton(link, "Fund Escrow", "primary")
      );
    },
  },

  // ── Template 38: chargeback_opened ──
  chargeback_opened: {
    accent: "#dc2626",
    subject: (data) =>
      `🚨 Chargeback filed — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const amount = data.chargebackAmount ? formatAmount(data.chargebackAmount) : "";
      const link = dealUrl(data.dealSlug);
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #991b1b;">Chargeback Filed</h2>` +
        `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 18px; margin: 16px 0;"><p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">Funds are frozen by the bank — not by CheckHire.</p></div>` +
        (amount ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">A chargeback of ${amount} was filed on <strong>${title}</strong>. The cardholder's bank has disputed this payment.</p>` : `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">A chargeback was filed on <strong>${title}</strong>. The cardholder's bank has disputed this payment.</p>`) +
        `<p style="margin: 0; font-size: 14px; color: #475569;">CheckHire will respond to the bank with the deal's evidence timeline. No action is required from you at this time.</p>` +
        buildCtaButton(link, "View Deal", "primary")
      );
    },
  },

  // ── Template 39: chargeback_closed ──
  chargeback_closed: {
    accent: "#64748b",
    subject: (data) =>
      `Chargeback resolved — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const status = data.chargebackStatus || "closed";
      const link = dealUrl(data.dealSlug);
      const won = status === "won";
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Chargeback ${won ? "Resolved in Your Favor" : "Lost"}</h2>` +
        (won
          ? `<p style="margin: 0; font-size: 14px; color: #475569;">The bank ruled in our favor on the chargeback for <strong>${title}</strong>. Funds have been returned and the deal can proceed normally.</p>`
          : `<p style="margin: 0; font-size: 14px; color: #475569;">The bank ruled against us on the chargeback for <strong>${title}</strong>. The funds have been removed from the platform. A member of the CheckHire team will reach out about next steps.</p>`) +
        buildCtaButton(link, "View Deal", "neutral")
      );
    },
  },

  // ── Template 40: transfer_failed ──
  payout_delayed: {
    accent: "#dc2626",
    subject: (data) =>
      `⚠️ Payout delayed — ${escapeHtml(data.dealTitle)}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const reason = data.failureReason ? escapeHtml(data.failureReason) : "a temporary issue";
      const link = dealUrl(data.dealSlug);
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #991b1b;">Payout Delayed</h2>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">We tried to send your payment for <strong>${title}</strong>, but it couldn't be processed due to ${reason}.</p>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">We're working on it. If the issue persists, please check that your bank details are correct in your payout settings.</p>` +
        buildCtaButton(`${APP_URL}/settings`, "Check Payout Settings", "primary")
      );
    },
  },

  // ── Template 41: payout_landed ──
  payout_landed: {
    accent: "#16a34a",
    subject: (data) =>
      `💰 ${formatAmount(data.amount!)} has arrived in your bank`,
    body: (data) => {
      const amount = formatAmount(data.amount!);
      return (
        buildHeroAmount(data.amount!, "released") +
        `<p style="margin: 20px 0 0 0; font-size: 14px; color: #475569;">${amount} has landed in your bank account. This payment is now complete.</p>` +
        `<p style="margin: 12px 0 0 0; font-size: 14px; color: #475569;">Thank you for using CheckHire. Your next gig is waiting.</p>` +
        buildCtaButton(`${APP_URL}/gigs`, "Browse Gigs", "success")
      );
    },
  },

  // ── Template (stub): milestone_submitted ──
  milestone_submitted: {
    accent: "#d97706",
    subject: (data) =>
      `Milestone submitted — ${escapeHtml(data.milestoneTitle || "Milestone")}`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const msTitle = escapeHtml(data.milestoneTitle || "Milestone");
      const link = dealUrl(data.dealSlug);
      return (
        `<p style="margin: 0; font-size: 14px; color: #475569;">Milestone <strong>${msTitle}</strong> on <strong>${title}</strong> has been submitted for review. You have 72 hours to approve.</p>` +
        buildCtaButton(link, "Review Now", "urgent")
      );
    },
  },

  // ── Moderation: Deal Approved ──
  moderation_approved: {
    accent: "#16a34a",
    subject: (data) => `Your gig "${escapeHtml(data.dealTitle)}" has been verified`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      const isFreelancer = data.role === "freelancer";
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Gig Verified</h2>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;"><strong>${title}</strong> has been reviewed and approved by CheckHire.</p>` +
        (isFreelancer
          ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">Payouts are now enabled. When work is confirmed or the 72-hour review period ends, funds will be released to your account.</p>`
          : `<p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">Everything looks good. Your gig is live and payouts are enabled.</p>`) +
        buildCtaButton(link, "View Gig", "brand")
      );
    },
  },

  // ── Moderation: Changes Requested ──
  moderation_changes_requested: {
    accent: "#2563eb",
    subject: (data) => `Changes needed on your gig "${escapeHtml(data.dealTitle)}"`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const link = dealUrl(data.dealSlug);
      const notes = data.notes ? escapeHtml(data.notes) : "Please review your gig details.";
      const isFreelancer = data.role === "freelancer";
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Changes Requested</h2>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">CheckHire has reviewed <strong>${title}</strong> and is requesting changes before it can be fully approved.</p>` +
        `<div style="margin: 0 0 16px 0; padding: 12px 16px; background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #2563eb;">` +
        `<p style="margin: 0; font-size: 14px; color: #1e40af;">${notes}</p>` +
        `</div>` +
        (isFreelancer
          ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">The client has been asked to update this gig. Your payment remains secured in escrow.</p>`
          : `<p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">Please update your gig to address the feedback above. Payouts are paused until the changes are reviewed.</p>`) +
        buildCtaButton(link, "View Gig", "brand")
      );
    },
  },

  // ── Moderation: Deal Rejected ──
  moderation_rejected: {
    accent: "#dc2626",
    subject: (data) => `Your gig "${escapeHtml(data.dealTitle)}" has been removed`,
    body: (data) => {
      const title = escapeHtml(data.dealTitle);
      const notes = data.notes ? escapeHtml(data.notes) : "This gig does not comply with our terms of service.";
      const isFreelancer = data.role === "freelancer";
      const amount = data.amount ? formatAmount(data.amount) : null;
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Gig Removed</h2>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;"><strong>${title}</strong> has been removed by CheckHire for not meeting our safety and content standards.</p>` +
        `<div style="margin: 0 0 16px 0; padding: 12px 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">` +
        `<p style="margin: 0; font-size: 14px; color: #991b1b;">${notes}</p>` +
        `</div>` +
        (isFreelancer
          ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">No funds were released for this gig. If you have questions, please contact hello@checkhire.co.</p>`
          : (amount
            ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">If you funded escrow, your payment of <strong>${amount}</strong> is being refunded to your original payment method. Refunds typically take 5-10 business days.</p>`
            : `<p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">If you believe this is an error, please contact hello@checkhire.co.</p>`)) +
        `<p style="margin: 0; font-size: 13px; color: #94a3b8;">Review our <a href="${APP_URL}/terms" style="color: #64748b; text-decoration: underline;">Terms of Service</a> for details on acceptable gig content.</p>`
      );
    },
  },

  // ── Template: account_suspended ──
  account_suspended: {
    accent: "#dc2626",
    subject: () => "Your CheckHire account has been suspended",
    body: (data) => {
      const name = data.displayName ? escapeHtml(data.displayName) : "there";
      const reason = data.suspensionReason
        ? escapeHtml(data.suspensionReason)
        : "a violation of our Terms of Service";
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #991b1b;">Account Suspended</h2>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">Hi ${name},</p>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">Your CheckHire account has been suspended due to ${reason}.</p>` +
        `<div style="margin: 0 0 16px 0; padding: 12px 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">` +
        `<p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">What this means:</p>` +
        `<p style="margin: 8px 0 0 0; font-size: 14px; color: #991b1b;">You cannot sign in, create or accept gigs, fund escrow, or receive payouts while your account is suspended. Any active deals have been paused.</p>` +
        `</div>` +
        `<p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">If you believe this is an error, please contact us at <a href="mailto:hello@checkhire.co" style="color: #0d9488; text-decoration: underline;">hello@checkhire.co</a> and we will review your account.</p>` +
        `<p style="margin: 0; font-size: 13px; color: #94a3b8;">Review our <a href="${APP_URL}/terms" style="color: #64748b; text-decoration: underline;">Terms of Service</a> for details on acceptable use.</p>`
      );
    },
  },

  // ── Template: account_unsuspended ──
  account_unsuspended: {
    accent: "#16a34a",
    subject: () => "Your CheckHire account has been restored",
    body: (data) => {
      const name = data.displayName ? escapeHtml(data.displayName) : "there";
      return (
        `<h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Account Restored</h2>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">Hi ${name},</p>` +
        `<p style="margin: 0 0 12px 0; font-size: 14px; color: #475569;">Good news — your CheckHire account has been restored and is fully active again.</p>` +
        `<div style="margin: 0 0 16px 0; padding: 12px 16px; background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #16a34a;">` +
        `<p style="margin: 0; font-size: 14px; color: #166534; font-weight: 600;">You can now:</p>` +
        `<p style="margin: 8px 0 0 0; font-size: 14px; color: #166534;">Sign in, create and accept gigs, fund escrow, receive payouts, and access all platform features as normal.</p>` +
        `</div>` +
        `<p style="margin: 0; font-size: 14px; color: #475569;">Thank you for your patience. If you have any questions, reach out to <a href="mailto:hello@checkhire.co" style="color: #0d9488; text-decoration: underline;">hello@checkhire.co</a>.</p>` +
        buildCtaButton(`${APP_URL}/dashboard`, "Go to Dashboard", "success")
      );
    },
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Export — matches original function signature
// ══════════════════════════════════════════════════════════════════════════════

export async function sendDealNotification(params: {
  type: NotificationType;
  to: string;
  data: NotificationData;
}): Promise<boolean> {
  const config = NOTIFICATION_CONFIG[params.type];
  if (!config) {
    console.error(
      `[sendDealNotification] Unknown notification type: ${params.type}`
    );
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
