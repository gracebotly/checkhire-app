import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileFormClient } from "./profile-client";

export default async function SeekerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: seekerProfile } = await supabase
    .from("seeker_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Your Profile"
        subtitle="Your skills and experience are shown to employers. Your name stays hidden until you advance in the hiring process."
      />
      <div className="mx-auto max-w-4xl px-6 py-8">
        <ProfileFormClient
          initialProfile={seekerProfile}
          fullName={userProfile?.full_name ?? ""}
          userId={user.id}
        />
      </div>
    </div>
  );
}
