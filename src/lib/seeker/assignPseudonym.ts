import { createClient as createServiceClient } from "@supabase/supabase-js";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Assigns a unique pseudonym for a candidate applying to a specific listing.
 * Calls the Postgres assign_pseudonym function which ensures uniqueness
 * within the listing and returns a random "Adjective Noun" pair.
 */
export async function assignPseudonym(listingId: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("assign_pseudonym", {
    p_listing_id: listingId,
  });

  if (error) {
    console.error("[assignPseudonym] RPC error:", error.message);
    // Fallback: generate a non-colliding pseudonym client-side
    const fallback = `Candidate ${Math.random().toString(36).substring(2, 10)}`;
    return fallback;
  }

  return data as string;
}
