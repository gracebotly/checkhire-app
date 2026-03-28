import { PageHeader } from "@/components/layout/page-header";
import { ApplicationsList } from "@/components/seeker/ApplicationsList";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SeekerApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: applications } = await supabase
    .from("applications")
    .select(`
      id, pseudonym, disclosure_level, status, created_at,
      job_listings (
        title, slug, job_type, pay_type, salary_min, salary_max,
        remote_type, status, created_at, expires_at,
        employers ( company_name, tier_level, logo_url, slug )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <PageHeader
        title="My Applications"
        subtitle="Track your applications and see where you stand."
      />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <ApplicationsList applications={applications || []} />
      </div>
    </div>
  );
}
