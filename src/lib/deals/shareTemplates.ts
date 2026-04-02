type ShareData = {
  title: string;
  amount: string;
  slug: string;
  description: string;
  deadline: string | null;
  category: string | null;
  clientName: string;
  funded: boolean;
};

function getDealUrl(slug: string): string {
  return `https://checkhire.co/deal/${slug}`;
}

export function getRedditPost(data: ShareData): string {
  const url = getDealUrl(data.slug);
  const fundedBadge = data.funded ? "✅ Payment Secured" : "⏳ Escrow Not Yet Funded";
  const parts = [
    `**${data.title}**`,
    "",
    `${fundedBadge}`,
    "",
    `**Budget:** ${data.amount}`,
  ];

  if (data.category) {
    parts.push(`**Category:** ${data.category}`);
  }
  if (data.deadline) {
    parts.push(`**Deadline:** ${data.deadline}`);
  }

  parts.push("", data.description, "", `**Apply here:** ${url}`, "", "---", "*Payment held in escrow through CheckHire. Freelancer keeps 100%.*");

  return parts.join("\n");
}

export function getTweet(data: ShareData): string {
  const url = getDealUrl(data.slug);
  const funded = data.funded ? "💰 Payment Secured" : "";
  return `${data.title} — ${data.amount}${funded ? ` ${funded}` : ""}\n\n${url}`;
}

export function getWhatsAppMessage(data: ShareData): string {
  const url = getDealUrl(data.slug);
  return `Hey! I'm looking for a freelancer for *${data.title}* — ${data.amount}.${data.funded ? " Payment is already secured in escrow." : ""}\n\nCheck it out: ${url}`;
}

export function getDiscordMessage(data: ShareData): string {
  const url = getDealUrl(data.slug);
  const desc =
    data.description.length > 200
      ? data.description.slice(0, 197) + "..."
      : data.description;
  return `**${data.title}** — ${data.amount}${data.funded ? " ✅ Payment Secured" : ""}\n\n${desc}\n\n${url}`;
}

export function getEmailSubject(data: ShareData): string {
  return `Freelance gig: ${data.title} — ${data.amount}`;
}

export function getEmailBody(data: ShareData): string {
  const url = getDealUrl(data.slug);
  return `Hi,\n\nI'm looking for a freelancer for the following gig:\n\n${data.title} — ${data.amount}\n\n${data.description}\n\n${data.funded ? "Payment is already secured in escrow through CheckHire." : "Payment will be held in escrow through CheckHire once funded."} The freelancer keeps 100% — zero fees.\n\nView the gig and apply: ${url}\n\nThanks,\n${data.clientName}`;
}

export function getSMSMessage(data: ShareData): string {
  const url = getDealUrl(data.slug);
  return `${data.title} — ${data.amount}. ${url}`;
}

export function getGenericCopy(data: ShareData): string {
  const url = getDealUrl(data.slug);
  return `${data.title} — ${data.amount}${data.funded ? " (Payment Secured)" : ""}\n\n${data.description}\n\n${url}`;
}
