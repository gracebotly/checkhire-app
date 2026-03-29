import type { SupabaseClient } from "@supabase/supabase-js";

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSlug(): string {
  let slug = "";
  for (let i = 0; i < 8; i++) {
    slug += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return slug;
}

export async function generateSlug(supabase: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = randomSlug();
    const { data } = await supabase
      .from("deals")
      .select("id")
      .eq("deal_link_slug", slug)
      .maybeSingle();

    if (!data) return slug;
  }
  throw new Error("Failed to generate unique slug after 5 attempts");
}
