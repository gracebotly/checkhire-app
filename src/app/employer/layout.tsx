import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EmployerSidebar } from "@/components/layout/cp-sidebar";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check user is an employer
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.user_type !== "employer") {
    redirect("/jobs");
  }

  // Fetch employer record via employer_users join
  const { data: employerUser } = await supabase
    .from("employer_users")
    .select("employer_id, role, employers(company_name, logo_url, domain_email_verified_at)")
    .eq("user_id", user.id)
    .maybeSingle();

  const rawEmployer = employerUser?.employers as
    | { company_name: string; logo_url: string | null; domain_email_verified_at: string | null }[]
    | { company_name: string; logo_url: string | null; domain_email_verified_at: string | null }
    | null;
  const employer = Array.isArray(rawEmployer) ? rawEmployer[0] ?? null : rawEmployer;

  const isDomainVerified = !!employer?.domain_email_verified_at;

  return (
    <div className="flex min-h-screen">
      <EmployerSidebar
        userEmail={user.email ?? ""}
        companyName={employer?.company_name ?? "My Company"}
        companyLogoUrl={employer?.logo_url ?? null}
      />
      <main className="min-h-screen flex-1 bg-[hsl(var(--main-bg))]">
        {/* Domain verification banner */}
        {!isDomainVerified && (
          <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="flex-1 text-sm text-slate-900">
              Verify your company email to start posting listings.{" "}
              <span className="text-slate-600">
                This confirms you work at the company you represent.
              </span>
            </p>
            <Link
              href="/employer/verify-email"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-amber-700"
            >
              Verify Now
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
