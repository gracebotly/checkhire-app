import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { createServiceClient } from "@/lib/supabase/service";
import { submitScamCheckSchema } from "@/lib/validation/scam-check";
import { notifyAdmin } from "@/lib/slack/notify";
import { scamCheckSubmitted } from "@/lib/slack/templates";
import { sendScamCheckConfirmation } from "@/lib/email/scamCheckEmails";
import { checkRateLimit, getClientIp } from "@/lib/api/rateLimit";

function normalizeUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

export const POST = withApiHandler(async (req: Request) => {
  // Rate limit: 5 submissions per IP per hour
  const ip = getClientIp(req);
  const { allowed } = await checkRateLimit(`scam-check:${ip}`, 3600, 5);
  if (!allowed) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = submitScamCheckSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { url, email, platform, scam_type, description } = parsed.data;
  const normalizedUrl = normalizeUrl(url);

  const serviceClient = createServiceClient();

  const { data, error } = await serviceClient
    .from("scam_submissions")
    .insert({
      url: normalizedUrl,
      platform,
      submitted_by_email: email,
      scam_type: scam_type || "not_sure",
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
    email,
    scam_type: scam_type || "not_sure",
    description: description || undefined,
    source: "website",
  }));

  // Fire-and-forget confirmation email to submitter
  sendScamCheckConfirmation({
    to: email,
    submissionId: data.id,
    url: normalizedUrl,
    platform,
    scamType: scam_type || null,
    description: description || null,
    submittedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id: data.id });
});
