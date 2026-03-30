import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProfileRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
