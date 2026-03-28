import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { DomainVerificationCard } from "@/components/employer/DomainVerificationCard";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

export default async function VerifyEmailPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch employer via employer_users
  const { data: employerUser } = await supabase
    .from("employer_users")
    .select("employer_id, employers(website_domain, domain_email_verified_at)")
    .eq("user_id", user.id)
    .maybeSingle();

  const rawEmployer = employerUser?.employers as
    | { website_domain: string | null; domain_email_verified_at: string | null }[]
    | { website_domain: string | null; domain_email_verified_at: string | null }
    | null;
  const employer = Array.isArray(rawEmployer) ? rawEmployer[0] ?? null : rawEmployer;

  const websiteDomain = employer?.website_domain ?? null;
  const isVerified = !!employer?.domain_email_verified_at;
  const verifiedAt = employer?.domain_email_verified_at ?? null;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Domain Verification"
        subtitle="Verify your company email to unlock job posting."
      />

      <div className="mx-auto max-w-xl px-6 py-6">
        {!websiteDomain && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              You need to set your company website domain before verifying your email.
            </p>
            <Link
              href="/employer/settings?tab=company"
              className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-amber-900 transition-colors duration-200 hover:text-amber-700"
            >
              <Settings className="h-4 w-4" />
              Go to Company Profile
            </Link>
          </div>
        )}

        <DomainVerificationCard
          websiteDomain={websiteDomain}
          isVerified={isVerified}
          verifiedAt={verifiedAt}
        />

        {isVerified && (
          <div className="mt-6">
            <Link
              href="/employer/listings/new"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
            >
              Post Your First Listing
            </Link>
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/employer/dashboard"
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
