import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EmployerSidebar } from "@/components/layout/cp-sidebar";

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
    .select("employer_id, role, employers(company_name, logo_url)")
    .eq("user_id", user.id)
    .maybeSingle();

  const rawEmployer = employerUser?.employers as
    | { company_name: string; logo_url: string | null }[]
    | { company_name: string; logo_url: string | null }
    | null;
  const employer = Array.isArray(rawEmployer) ? rawEmployer[0] ?? null : rawEmployer;

  return (
    <div className="flex min-h-screen">
      <EmployerSidebar
        userEmail={user.email ?? ""}
        companyName={employer?.company_name ?? "My Company"}
        companyLogoUrl={employer?.logo_url ?? null}
      />
      <main className="min-h-screen flex-1 bg-[hsl(var(--main-bg))]">
        {children}
      </main>
    </div>
  );
}
