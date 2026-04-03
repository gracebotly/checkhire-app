/**
 * Slack notification templates for admin alerts.
 *
 * Each function returns a formatted Slack Block Kit message.
 * All amounts are in cents — divide by 100 for display.
 *
 * Slack Block Kit docs: https://api.slack.com/block-kit
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://checkhire.co";

type SlackField = { type: "mrkdwn"; text: string };
type SlackBlock = {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text: string; emoji?: boolean }>;
  fields?: Array<{ type: string; text: string }>;
};

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function dealLink(slug: string, title: string): string {
  return `<${APP_URL}/deal/${slug}|${title}>`;
}

function adminLink(dealId: string): string {
  return `<${APP_URL}/admin/deals/${dealId}|View in Admin>`;
}

export function escrowFunded(deal: {
  id: string;
  title: string;
  deal_link_slug: string;
  total_amount: number;
  client_name: string;
}) {
  return {
    text: `💰 Escrow funded: ${formatAmount(deal.total_amount)} on "${deal.title}"`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "💰 Escrow Funded", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Deal:*\n${dealLink(deal.deal_link_slug, deal.title)}` },
          { type: "mrkdwn", text: `*Amount:*\n${formatAmount(deal.total_amount)}` },
          { type: "mrkdwn", text: `*Client:*\n${deal.client_name}` },
          { type: "mrkdwn", text: `*Admin:*\n${adminLink(deal.id)}` },
        ],
      },
    ],
  };
}

export function disputeOpened(dispute: {
  deal_id: string;
  deal_title: string;
  deal_link_slug: string;
  deal_amount: number;
  category: string;
  initiated_by_name: string;
  initiated_by_role: string;
}) {
  return {
    text: `⚠️ Dispute opened on "${dispute.deal_title}" — ${dispute.category}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "⚠️ Dispute Opened", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Deal:*\n${dealLink(dispute.deal_link_slug, dispute.deal_title)}` },
          { type: "mrkdwn", text: `*Amount at Stake:*\n${formatAmount(dispute.deal_amount)}` },
          { type: "mrkdwn", text: `*Category:*\n${dispute.category}` },
          { type: "mrkdwn", text: `*Opened By:*\n${dispute.initiated_by_name} (${dispute.initiated_by_role})` },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `${adminLink(dispute.deal_id)}` },
      },
    ],
  };
}

export function disputeEscalated(dispute: {
  deal_id: string;
  deal_title: string;
  deal_link_slug: string;
  deal_amount: number;
  negotiation_round: number;
}) {
  return {
    text: `🔴 Dispute ESCALATED — "${dispute.deal_title}" needs manual review`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "🔴 Dispute Escalated — Action Required", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Deal:*\n${dealLink(dispute.deal_link_slug, dispute.deal_title)}` },
          { type: "mrkdwn", text: `*Amount:*\n${formatAmount(dispute.deal_amount)}` },
          { type: "mrkdwn", text: `*Rounds Failed:*\n${dispute.negotiation_round}` },
          { type: "mrkdwn", text: `*Action:*\n${adminLink(dispute.deal_id)}` },
        ],
      },
    ],
  };
}

export function autoReleaseTriggered(deal: {
  id: string;
  title: string;
  deal_link_slug: string;
  total_amount: number;
  freelancer_name: string;
}) {
  return {
    text: `⏰ Auto-release: ${formatAmount(deal.total_amount)} released to ${deal.freelancer_name} on "${deal.title}"`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "⏰ Auto-Release Triggered", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Deal:*\n${dealLink(deal.deal_link_slug, deal.title)}` },
          { type: "mrkdwn", text: `*Amount:*\n${formatAmount(deal.total_amount)}` },
          { type: "mrkdwn", text: `*Freelancer:*\n${deal.freelancer_name}` },
          { type: "mrkdwn", text: `*Admin:*\n${adminLink(deal.id)}` },
        ],
      },
    ],
  };
}

export function payoutCompleted(deal: {
  id: string;
  title: string;
  deal_link_slug: string;
  total_amount: number;
  freelancer_name: string;
  payout_method: string;
}) {
  return {
    text: `✅ Payout: ${formatAmount(deal.total_amount)} sent to ${deal.freelancer_name}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "✅ Payout Completed", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Deal:*\n${dealLink(deal.deal_link_slug, deal.title)}` },
          { type: "mrkdwn", text: `*Amount:*\n${formatAmount(deal.total_amount)}` },
          { type: "mrkdwn", text: `*To:*\n${deal.freelancer_name}` },
          { type: "mrkdwn", text: `*Method:*\n${deal.payout_method}` },
        ],
      },
    ],
  };
}

export function dealFlaggedForReview(deal: {
  id: string;
  title: string;
  deal_link_slug: string;
  flagged_reason: string;
  client_name: string;
}) {
  return {
    text: `🔍 Deal flagged: "${deal.title}" — ${deal.flagged_reason}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "🔍 Deal Flagged for Review", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Deal:*\n${dealLink(deal.deal_link_slug, deal.title)}` },
          { type: "mrkdwn", text: `*Reason:*\n${deal.flagged_reason}` },
          { type: "mrkdwn", text: `*Client:*\n${deal.client_name}` },
          { type: "mrkdwn", text: `*Action:*\n${adminLink(deal.id)}` },
        ],
      },
    ],
  };
}

export function referralPayoutRequested(payout: {
  user_name: string;
  amount: number;
  total_referrals: number;
}) {
  return {
    text: `💸 Referral payout requested: ${formatAmount(payout.amount)} by ${payout.user_name}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "💸 Referral Payout Requested", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*User:*\n${payout.user_name}` },
          { type: "mrkdwn", text: `*Amount:*\n${formatAmount(payout.amount)}` },
          { type: "mrkdwn", text: `*Total Referrals:*\n${payout.total_referrals}` },
        ],
      },
    ],
  };
}

export function newUserSignup(user: {
  display_name: string;
  email: string;
  referred_by?: string;
}) {
  const fields: SlackField[] = [
    { type: "mrkdwn", text: `*Name:*\n${user.display_name}` },
    { type: "mrkdwn", text: `*Email:*\n${user.email}` },
  ];

  if (user.referred_by) {
    fields.push({ type: "mrkdwn", text: `*Referred By:*\n${user.referred_by}` });
  }

  return {
    text: `👤 New signup: ${user.display_name} (${user.email})`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "👤 New User Signup", emoji: true },
      },
      {
        type: "section",
        fields,
      },
    ],
  };
}

export function scamCheckSubmitted(submission: {
  id: string;
  url: string;
  platform: string;
  email?: string;
  description?: string;
  source: string;
}) {
  const fields: Array<{ type: string; text: string }> = [
    { type: "mrkdwn", text: `*Link:*\n${submission.url}` },
    { type: "mrkdwn", text: `*Platform:*\n${submission.platform}` },
    { type: "mrkdwn", text: `*Source:*\n${submission.source}` },
  ];
  if (submission.email) {
    fields.push({ type: "mrkdwn", text: `*Email:*\n${submission.email}` });
  }

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "🔍 New Scam Check Submission", emoji: true },
    },
    {
      type: "section",
      fields,
    },
  ];

  if (submission.description) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Description:*\n${submission.description}` },
    });
  }

  blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: `<${APP_URL}/admin?tab=scam-checks|Review in Admin>` },
  });

  return {
    text: `🔍 New scam check: ${submission.url} (via ${submission.source})`,
    blocks,
  };
}
