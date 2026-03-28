import { createClient } from "@/lib/supabase/server";
import type { SeekerProfile } from "@/types/database";

export type SeekerContext = {
  userId: string;
  profile: SeekerProfile;
};

/**
 * Resolves the current authenticated user's seeker profile.
 * Returns null if the user is not authenticated or has no seeker profile.
 */
export async function getSeekerProfile(): Promise<SeekerContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("seeker_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    userId: user.id,
    profile: profile as SeekerProfile,
  };
}
