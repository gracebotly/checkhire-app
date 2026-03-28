import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Creates an employer record and employer_users link when a new employer signs up.
 * Called from auth/callback and auth/confirm routes.
 *
 * This implements the Company Claim Model:
 * - Generates a slug from company_name
 * - Sets claimed_by to the signing-up user
 * - Creates an employer_users row with role='admin'
 */
export async function createEmployerOnSignup(
  userId: string,
  companyName: string
): Promise<{ employerId: string | null; error: string | null }> {
  const safeName = companyName.trim() || "My Company";

  // Generate slug from company name
  const baseSlug = safeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const slug = `${baseSlug}-${randomSuffix}`;

  // Create employer record
  const { data: employer, error: employerError } = await supabaseAdmin
    .from("employers")
    .insert({
      company_name: safeName,
      claimed_by: userId,
      tier_level: 3,
      slug,
      country: "US",
    })
    .select("id")
    .single();

  if (employerError) {
    console.error("[createEmployerOnSignup] Failed to create employer:", employerError.message);
    return { employerId: null, error: employerError.message };
  }

  // Create employer_users link (admin role)
  const { error: linkError } = await supabaseAdmin
    .from("employer_users")
    .insert({
      employer_id: employer.id,
      user_id: userId,
      role: "admin",
    });

  if (linkError) {
    console.error("[createEmployerOnSignup] Failed to create employer_user link:", linkError.message);
    return { employerId: employer.id, error: linkError.message };
  }

  return { employerId: employer.id, error: null };
}
