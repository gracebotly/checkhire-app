import sgMail from "@sendgrid/mail";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize SendGrid — only if API key is set
const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_KEY) {
  sgMail.setApiKey(SENDGRID_KEY);
}

/**
 * Relays an email through SendGrid using masked addresses.
 * Neither party sees the other's real email.
 */
export async function relayEmail(params: {
  fromMasked: string;
  toReal: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  maskedPairId: string;
  direction: "employer_to_applicant" | "applicant_to_employer";
}): Promise<boolean> {
  if (!SENDGRID_KEY) {
    console.warn("[sendgridRelay] SENDGRID_API_KEY not set — skipping relay");
    return false;
  }

  try {
    await sgMail.send({
      to: params.toReal,
      from: {
        email: params.fromMasked,
        name: "CheckHire",
      },
      replyTo: params.fromMasked,
      subject: params.subject,
      text: params.textBody,
      ...(params.htmlBody ? { html: params.htmlBody } : {}),
    });

    // Log the communication (metadata only, no content)
    await supabaseAdmin.from("communication_logs").insert({
      masked_email_pair_id: params.maskedPairId,
      communication_type: "email",
      direction: params.direction,
      subject_snippet: params.subject.slice(0, 50),
    });

    return true;
  } catch (err) {
    console.error("[sendgridRelay] Send error:", err);
    return false;
  }
}

/**
 * Rate-limits relay emails: max 50 per day per employer.
 * Returns true if under the limit.
 */
export async function checkRelayRateLimit(employerId: string): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: pairs, error: pairError } = await supabaseAdmin
    .from("masked_email_pairs")
    .select("id")
    .eq("employer_id", employerId);

  if (pairError) {
    console.error("[sendgridRelay] Pair lookup error:", pairError);
    return true;
  }

  const pairIds = pairs?.map((p) => p.id) || [];
  if (pairIds.length === 0) return true;

  const { count, error } = await supabaseAdmin
    .from("communication_logs")
    .select("id", { count: "exact", head: true })
    .eq("communication_type", "email")
    .eq("direction", "employer_to_applicant")
    .gte("timestamp", oneDayAgo)
    .in("masked_email_pair_id", pairIds);

  if (error) {
    console.error("[sendgridRelay] Rate limit check error:", error);
    return true; // Allow on error to avoid blocking legitimate use
  }

  return (count || 0) < 50;
}
