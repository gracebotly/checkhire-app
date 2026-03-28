import { SeekerSidebar } from "@/components/layout/seeker-sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SeekerLayout({
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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_type, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.user_type !== "job_seeker") {
    redirect("/employer/dashboard");
  }

  const { data: seekerProfile } = await supabase
    .from("seeker_profiles")
    .select("parse_status")
    .eq("id", user.id)
    .maybeSingle();

  const hasProfile = !!seekerProfile;
  const displayName =
    profile.full_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "Job Seeker";

  return (
    <div className="flex min-h-screen">
      <SeekerSidebar userEmail={user.email ?? ""} displayName={displayName} />
      <main className="min-h-screen flex-1 bg-[hsl(var(--main-bg))]">
        {!hasProfile && (
          <div className="flex items-center gap-3 border-b border-blue-200 bg-blue-50 px-6 py-2.5">
            <p className="flex-1 text-sm text-slate-900">
              Complete your profile to start applying.{" "}
              <span className="text-slate-600">
                Upload a resume and add your skills.
              </span>
            </p>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
