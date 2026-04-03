import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createServiceClient } from "@/lib/supabase/service";
import { submitScamCheckSchema } from "@/lib/validation/scam-check";
import { notifyAdmin } from "@/lib/slack/notify";
import { scamCheckSubmitted } from "@/lib/slack/templates";

function detectPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("reddit.com") || lower.includes("redd.it")) return "reddit";
  if (lower.includes("facebook.com") || lower.includes("fb.com") || lower.includes("fb.me")) return "facebook";
  if (lower.includes("discord.com") || lower.includes("discord.gg")) return "discord";
  if (lower.includes("twitter.com") || lower.includes("x.com")) return "twitter";
  if (lower.includes("craigslist.org")) return "craigslist";
  if (lower.includes("linkedin.com")) return "linkedin";
  return "other";
}

function normalizeUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

export const POST = withApiHandler(async (req: Request) => {
  const body = await req.json();
  const parsed = submitScamCheckSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { url, email, description } = parsed.data;
  const normalizedUrl = normalizeUrl(url);
  const platform = detectPlatform(normalizedUrl);

  const serviceClient = createServiceClient();

  const { data, error } = await serviceClient
    .from("scam_submissions")
    .insert({
      url: normalizedUrl,
      platform,
      submitted_by_email: email || null,
      description: description || null,
      source: "website",
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[scam-check] Insert failed:", error);
    return NextResponse.json(
      { ok: false, code: "INSERT_FAILED", message: "Failed to submit. Please try again." },
      { status: 500 }
    );
  }

  // Fire-and-forget Slack notification
  notifyAdmin(scamCheckSubmitted({
    id: data.id,
    url: normalizedUrl,
    platform,
    email: email || undefined,
    description: description || undefined,
    source: "website",
  }));

  return NextResponse.json({ ok: true, id: data.id });
});
