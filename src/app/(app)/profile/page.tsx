import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProfileRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auth redirect is handled by middleware
  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-slate-600">Please sign in to view your profile.</p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("profile_slug")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.profile_slug) {
    redirect(`/u/${profile.profile_slug}`);
  }

  redirect("/settings");
}
