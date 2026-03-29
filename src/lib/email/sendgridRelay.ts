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
 * Uses a single query that counts outbound logs joined through pairs.
 * Returns true if under the limit.
 */
export async function checkRelayRateLimit(employerId: string): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Single query: count communication_logs rows where the pair belongs to this employer
  // and the email was outbound (employer → applicant) within the last 24 hours
  const { count, error } = await supabaseAdmin
    .from("communication_logs")
    .select("id, masked_email_pairs!inner(employer_id)", { count: "exact", head: true })
    .eq("masked_email_pairs.employer_id", employerId)
    .eq("communication_type", "email")
    .eq("direction", "employer_to_applicant")
    .gte("timestamp", oneDayAgo);

  if (error) {
    // If the join query fails (e.g., no FK relationship configured),
    // fall back to the two-step approach
    console.warn("[sendgridRelay] Join query failed, falling back:", error.message);
    return await checkRelayRateLimitFallback(employerId, oneDayAgo);
  }

  return (count || 0) < 50;
}

/**
 * Fallback two-step rate limit check if the joined query isn't supported.
 */
async function checkRelayRateLimitFallback(
  employerId: string,
  oneDayAgo: string
): Promise<boolean> {
  const { data: pairs } = await supabaseAdmin
    .from("masked_email_pairs")
    .select("id")
    .eq("employer_id", employerId);

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
    console.error("[sendgridRelay] Fallback rate limit error:", error);
    return true;
  }

  return (count || 0) < 50;
}
