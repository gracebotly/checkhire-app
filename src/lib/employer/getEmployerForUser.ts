import { createClient } from "@/lib/supabase/server";

export type EmployerContext = {
  employerId: string;
  userId: string;
  role: "admin" | "poster";
  employer: {
    id: string;
    company_name: string;
    website_domain: string | null;
    description: string | null;
    industry: string | null;
    company_size: string | null;
    country: string;
    logo_url: string | null;
    tier_level: number;
    slug: string | null;
    domain_email_verified_at: string | null;
    created_at: string;
  };
};

/**
 * Resolves the current authenticated user's employer context.
 * Returns null if the user is not authenticated or not linked to an employer.
 */
export async function getEmployerForUser(): Promise<EmployerContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: employerUser } = await supabase
    .from("employer_users")
    .select(
      `
      employer_id,
      role,
      employers (
        id,
        company_name,
        website_domain,
        description,
        industry,
        company_size,
        country,
        logo_url,
        tier_level,
        slug,
        domain_email_verified_at,
        created_at
      )
    `
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!employerUser || !employerUser.employers) return null;

  const rawEmployer = employerUser.employers as
    | EmployerContext["employer"][]
    | EmployerContext["employer"];
  const employer = Array.isArray(rawEmployer) ? rawEmployer[0] : rawEmployer;

  if (!employer) return null;

  return {
    employerId: employerUser.employer_id,
    userId: user.id,
    role: employerUser.role as "admin" | "poster",
    employer,
  };
}
