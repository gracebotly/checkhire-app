import type { SupabaseClient } from "@supabase/supabase-js";

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSuffix(length: number = 5): string {
  let suffix = "";
  for (let i = 0; i < length; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return suffix;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric except spaces and hyphens
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, "") // trim leading/trailing hyphens
    .slice(0, 40); // max 40 chars for the title portion
}

export async function generateSlug(
  supabase: SupabaseClient,
  title?: string
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const titleSlug = title ? slugify(title) : "";
    const suffix = randomSuffix(titleSlug ? 5 : 8);
    const slug = titleSlug ? `${titleSlug}-${suffix}` : suffix;

    const { data } = await supabase
      .from("deals")
      .select("id")
      .eq("deal_link_slug", slug)
      .maybeSingle();

    if (!data) return slug;
  }
  throw new Error("Failed to generate unique slug after 5 attempts");
}
