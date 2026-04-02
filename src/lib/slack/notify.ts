/**
 * Slack Admin Notification Utility
 *
 * Posts formatted messages to the CheckHire admin Slack channel
 * via an Incoming Webhook. Fire-and-forget — failures are logged
 * but never block the user-facing request.
 */

type SlackBlock = {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text: string; emoji?: boolean }>;
  fields?: Array<{ type: string; text: string }>;
};

type SlackMessage = {
  text: string; // Fallback text for notifications
  blocks: SlackBlock[];
};

export async function notifyAdmin(message: SlackMessage): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("[Slack] SLACK_WEBHOOK_URL not set — skipping notification");
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(`[Slack] Webhook failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    // Fire-and-forget — log but never throw
    console.error("[Slack] Notification failed:", error);
  }
}
