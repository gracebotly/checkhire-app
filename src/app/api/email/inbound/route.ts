import { NextResponse } from "next/server";
import {
  lookupByMaskedAddress,
  resolveEmployerEmail,
  resolveUserEmail,
} from "@/lib/email/maskedEmail";
import { checkRelayRateLimit, relayEmail } from "@/lib/email/sendgridRelay";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/email/inbound
 *
 * SendGrid Inbound Parse webhook handler.
 * MUST return 200 to prevent SendGrid retries.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const toRaw = formData.get("to")?.toString() || "";
    const fromRaw = formData.get("from")?.toString() || "";
    const subject = formData.get("subject")?.toString() || "(no subject)";
    const text = formData.get("text")?.toString() || "";
    const html = formData.get("html")?.toString() || "";

    const extractEmail = (raw: string): string => {
      const match = raw.match(/<([^>]+)>/);
      return (match ? match[1] : raw).toLowerCase().trim();
    };

    const toAddress = extractEmail(toRaw);
    const fromAddress = extractEmail(fromRaw);

    if (!toAddress || !fromAddress) {
      console.warn("[inbound] Missing to/from address");
      return NextResponse.json({ ok: true });
    }

    const lookup = await lookupByMaskedAddress(toAddress);
    if (!lookup) {
      console.warn(`[inbound] No active pair found for: ${toAddress}`);
      return NextResponse.json({ ok: true });
    }

    const { pair, direction } = lookup;

    const { data: application } = await supabaseAdmin
      .from("applications")
      .select("disclosure_level, status")
      .eq("id", pair.application_id)
      .maybeSingle();

    if (!application || application.disclosure_level < 2) {
      console.warn(`[inbound] Pair ${pair.id}: disclosure level < 2, dropping`);
      return NextResponse.json({ ok: true });
    }

    const terminalStatuses = ["rejected", "withdrawn", "hired"];
    if (terminalStatuses.includes(application.status)) {
      console.warn(
        `[inbound] Pair ${pair.id}: application status ${application.status}, dropping`
      );
      return NextResponse.json({ ok: true });
    }

    let recipientRealEmail: string | null = null;
    let senderMaskedAddress: string;

    if (direction === "employer_to_applicant") {
      recipientRealEmail = await resolveUserEmail(pair.applicant_user_id);
      senderMaskedAddress = pair.employer_masked_email;

      const allowed = await checkRelayRateLimit(pair.employer_id);
      if (!allowed) {
        console.warn(`[inbound] Employer ${pair.employer_id} rate limited`);
        return NextResponse.json({ ok: true });
      }
    } else {
      recipientRealEmail = await resolveEmployerEmail(pair.employer_id);
      senderMaskedAddress = pair.applicant_masked_email;
    }

    if (!recipientRealEmail) {
      console.error(`[inbound] Could not resolve recipient email for pair ${pair.id}`);
      return NextResponse.json({ ok: true });
    }

    let relayText = text;
    let relayHtml = html || undefined;

    if (application.disclosure_level < 3) {
      const attachmentCount = parseInt(
        formData.get("attachments")?.toString() || "0",
        10
      );
      if (attachmentCount > 0) {
        const notice =
          "\n\n[Attachments were removed. File sharing is available after the interview stage.]\n";
        relayText += notice;
        if (relayHtml) {
          relayHtml +=
            '<p style="color:#666;font-size:12px;margin-top:16px;"><em>Attachments were removed. File sharing is available after the interview stage.</em></p>';
        }
      }
    }

    await relayEmail({
      fromMasked: senderMaskedAddress,
      toReal: recipientRealEmail,
      subject,
      textBody: relayText,
      htmlBody: relayHtml,
      maskedPairId: pair.id,
      direction,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[inbound] Unhandled error:", err);
    return NextResponse.json({ ok: true });
  }
}
