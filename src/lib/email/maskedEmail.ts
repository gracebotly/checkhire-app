import crypto from "node:crypto";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { MaskedEmailPair } from "@/types/database";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DOMAIN = process.env.SENDGRID_INBOUND_DOMAIN || "mail.checkhire.com";

/**
 * Generates a deterministic but opaque masked email address.
 * Uses a short hash of applicationId + prefix + a secret salt.
 */
function generateMaskedAddress(
  prefix: "applicant" | "employer",
  applicationId: string
): string {
  const salt = process.env.SENDGRID_API_KEY || "checkhire-salt";
  const hash = crypto
    .createHash("sha256")
    .update(`${prefix}:${applicationId}:${salt}`)
    .digest("hex")
    .slice(0, 8);
  return `${prefix}-${hash}@${DOMAIN}`;
}

/**
 * Creates and activates a masked email pair for an application.
 * Called when a candidate accepts an interview (Stage 2).
 * Returns the created pair or null if one already exists.
 */
export async function activateMaskedPair(
  applicationId: string,
  employerId: string,
  applicantUserId: string
): Promise<MaskedEmailPair | null> {
  // Check if pair already exists
  const { data: existing } = await supabaseAdmin
    .from("masked_email_pairs")
    .select("*")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (existing) {
    // If deactivated, reactivate
    if (existing.status === "deactivated") {
      const { data: updated } = await supabaseAdmin
        .from("masked_email_pairs")
        .update({
          status: "active",
          activated_at: new Date().toISOString(),
          deactivated_at: null,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      return updated as MaskedEmailPair | null;
    }
    return existing as MaskedEmailPair;
  }

  const employerMasked = generateMaskedAddress("employer", applicationId);
  const applicantMasked = generateMaskedAddress("applicant", applicationId);

  const { data: pair, error } = await supabaseAdmin
    .from("masked_email_pairs")
    .insert({
      application_id: applicationId,
      employer_id: employerId,
      applicant_user_id: applicantUserId,
      employer_masked_email: employerMasked,
      applicant_masked_email: applicantMasked,
      status: "active",
    })
    .select("*")
    .single();

  if (error) {
    console.error("[maskedEmail] Failed to create pair:", error.message);
    return null;
  }

  return pair as MaskedEmailPair;
}

/**
 * Deactivates a masked email pair for a specific application.
 * Called when a listing closes, candidate is rejected, or candidate withdraws.
 */
export async function deactivateMaskedPair(
  applicationId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("masked_email_pairs")
    .update({
      status: "deactivated",
      deactivated_at: new Date().toISOString(),
    })
    .eq("application_id", applicationId)
    .eq("status", "active");

  if (error) {
    console.error("[maskedEmail] Failed to deactivate pair:", error.message);
  }
}

/**
 * Deactivates ALL masked email pairs for applications on a given listing.
 * Called when a listing is closed.
 */
export async function deactivateAllPairsForListing(
  listingId: string
): Promise<number> {
  // Get all application IDs for this listing
  const { data: apps } = await supabaseAdmin
    .from("applications")
    .select("id")
    .eq("job_listing_id", listingId);

  if (!apps || apps.length === 0) return 0;

  const appIds = apps.map((a) => a.id);

  const { data, error } = await supabaseAdmin
    .from("masked_email_pairs")
    .update({
      status: "deactivated",
      deactivated_at: new Date().toISOString(),
    })
    .in("application_id", appIds)
    .eq("status", "active")
    .select("id");

  if (error) {
    console.error("[maskedEmail] Failed to bulk deactivate:", error.message);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Looks up a masked email pair by the masked address (either side).
 * Returns the pair and resolves which direction the email is going.
 */
export async function lookupByMaskedAddress(
  maskedAddress: string
): Promise<{
  pair: MaskedEmailPair;
  direction: "employer_to_applicant" | "applicant_to_employer";
  recipientUserId: string;
} | null> {
  const lower = maskedAddress.toLowerCase().trim();

  // Try employer masked address first
  const { data: employerMatch } = await supabaseAdmin
    .from("masked_email_pairs")
    .select("*")
    .eq("employer_masked_email", lower)
    .eq("status", "active")
    .maybeSingle();

  if (employerMatch) {
    // Email was sent TO the employer's masked address → it's FROM the applicant
    return {
      pair: employerMatch as MaskedEmailPair,
      direction: "applicant_to_employer",
      recipientUserId: "", // Will resolve employer user from employer_id
    };
  }

  // Try applicant masked address
  const { data: applicantMatch } = await supabaseAdmin
    .from("masked_email_pairs")
    .select("*")
    .eq("applicant_masked_email", lower)
    .eq("status", "active")
    .maybeSingle();

  if (applicantMatch) {
    // Email was sent TO the applicant's masked address → it's FROM the employer
    return {
      pair: applicantMatch as MaskedEmailPair,
      direction: "employer_to_applicant",
      recipientUserId: applicantMatch.applicant_user_id,
    };
  }

  return null;
}

/**
 * Resolves a user's real email from their auth ID.
 */
export async function resolveUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data?.user?.email || null;
}

/**
 * Resolves the employer admin's real email from the employer ID.
 */
export async function resolveEmployerEmail(
  employerId: string
): Promise<string | null> {
  const { data: employer } = await supabaseAdmin
    .from("employers")
    .select("claimed_by")
    .eq("id", employerId)
    .maybeSingle();

  if (!employer?.claimed_by) return null;
  return resolveUserEmail(employer.claimed_by);
}
