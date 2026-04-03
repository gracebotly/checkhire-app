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

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3).replace(/\s+\S*$/, "") + "...";
}

export function getRedditPost(data: ShareData): string {
  const url = getDealUrl(data.slug);
  const fundedBadge = data.funded ? "✅ Payment Secured" : "⏳ Escrow Not Yet Funded";
  const parts = [
    `**${data.title}**`,
    "",
    `${fundedBadge}`,
    "",
    truncate(data.description, 300),
    "",
    `**Budget:** ${data.amount}`,
  ];

  if (data.category) {
    parts.push(`**Category:** ${data.category}`);
  }
  if (data.deadline) {
    parts.push(`**Deadline:** ${data.deadline}`);
  }

  parts.push(
    "",
    `**Apply here:** ${url}`,
    "",
    "---",
    "*Payment held in escrow through CheckHire. Freelancer keeps 100%.*"
  );

  return parts.join("\n");
}

export function getTweet(data: ShareData): string {
  const url = getDealUrl(data.slug);
  const funded = data.funded ? " ✓ Payment Secured" : "";
  const desc = truncate(data.description, 80);
  return `Hiring: ${data.title} — ${data.amount}${funded}

${desc}

${url}`;
}

export function getWhatsAppMessage(data: ShareData): string {
  const url = getDealUrl(data.slug);
  const desc = truncate(data.description, 150);
  const fundedNote = data.funded ? "\n\n💰 Payment already secured in escrow." : "";
  const deadlineNote = data.deadline ? `\n📅 Deadline: ${data.deadline}` : "";
  return `*${data.title}* — ${data.amount}

${desc}${fundedNote}${deadlineNote}

Apply here: ${url}`;
}

export function getDiscordMessage(data: ShareData): string {
  const url = getDealUrl(data.slug);
  const desc = truncate(data.description, 200);
  const funded = data.funded ? " ✅ Payment Secured" : "";
  const deadlineNote = data.deadline ? `\n📅 Deadline: ${data.deadline}` : "";
  return `**${data.title}** — ${data.amount}${funded}

${desc}${deadlineNote}

Apply: ${url}`;
}

export function getEmailSubject(data: ShareData): string {
  return `Freelance gig: ${data.title} — ${data.amount}`;
}

export function getEmailBody(data: ShareData): string {
  const url = getDealUrl(data.slug);
  const fundedNote = data.funded
    ? "Payment is already secured in escrow through CheckHire."
    : "Payment will be held in escrow through CheckHire once funded.";
  const deadlineNote = data.deadline ? `\nDeadline: ${data.deadline}` : "";
  return `Hi,

I'm looking for a freelancer for the following gig:

${data.title} — ${data.amount}${deadlineNote}

${truncate(data.description, 400)}

${fundedNote} The freelancer keeps 100% — zero fees.

View the gig and apply: ${url}

Thanks,
${data.clientName}`;
}

export function getSMSMessage(data: ShareData): string {
  const url = getDealUrl(data.slug);
  return `Hiring: ${data.title} — ${data.amount}. ${truncate(data.description, 60)} ${url}`;
}

export function getGenericCopy(data: ShareData): string {
  const url = getDealUrl(data.slug);
  const funded = data.funded ? " (Payment Secured)" : "";
  return `${data.title} — ${data.amount}${funded}

${truncate(data.description, 250)}

Apply: ${url}`;
}
