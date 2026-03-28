import { withApiHandler } from "@/lib/api/withApiHandler";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/messages/threads
 *
 * Returns all active chat threads for the current user.
 * Works for both employers and seekers.
 *
 * Each thread includes:
 * - Application context (pseudonym, disclosure_level, status)
 * - Listing context (title, company name, tier)
 * - Latest message preview
 * - Unread count
 *
 * Sorted by most recent message activity.
 */
export const GET = withApiHandler(async function GET(req: Request) {
  void req;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated." },
      { status: 401 }
    );
  }

  // Determine user type
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { ok: false, code: "NO_PROFILE", message: "User profile not found." },
      { status: 404 }
    );
  }

  const isSeeker = profile.user_type === "job_seeker";

  // Get all applications with messages for this user
  let applicationIds: string[] = [];

  if (isSeeker) {
    // Seeker: get applications they own that have messages
    const { data: apps } = await supabaseAdmin
      .from("applications")
      .select("id")
      .eq("user_id", user.id);

    applicationIds = (apps || []).map((a: { id: string }) => a.id);
  } else {
    // Employer: get applications on their listings that have messages
    const { data: employerUser } = await supabaseAdmin
      .from("employer_users")
      .select("employer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!employerUser) {
      return NextResponse.json({ ok: true, threads: [] });
    }

    const { data: listings } = await supabaseAdmin
      .from("job_listings")
      .select("id")
      .eq("employer_id", employerUser.employer_id);

    const listingIds = (listings || []).map((l: { id: string }) => l.id);

    if (listingIds.length === 0) {
      return NextResponse.json({ ok: true, threads: [] });
    }

    const { data: apps } = await supabaseAdmin
      .from("applications")
      .select("id")
      .in("job_listing_id", listingIds);

    applicationIds = (apps || []).map((a: { id: string }) => a.id);
  }

  if (applicationIds.length === 0) {
    return NextResponse.json({ ok: true, threads: [] });
  }

  // Get applications with messages — only include threads that have at least one message
  const { data: messagesRaw } = await supabaseAdmin
    .from("messages")
    .select("application_id")
    .in("application_id", applicationIds)
    .is("deleted_at", null);

  const threadAppIds = [...new Set((messagesRaw || []).map((m: { application_id: string }) => m.application_id))];

  if (threadAppIds.length === 0) {
    return NextResponse.json({ ok: true, threads: [] });
  }

  // Fetch full application data for threads
  const { data: applications } = await supabaseAdmin
    .from("applications")
    .select(`
      id, pseudonym, disclosure_level, status, user_id, created_at,
      job_listings (
        id, title, slug,
        employers ( company_name, tier_level, logo_url )
      )
    `)
    .in("id", threadAppIds);

  if (!applications || applications.length === 0) {
    return NextResponse.json({ ok: true, threads: [] });
  }

  // For each thread, get the latest message and unread count
  const threads = await Promise.all(
    applications.map(async (app) => {
      // Latest message
      const { data: latestMessages } = await supabaseAdmin
        .from("messages")
        .select("message_text, sender_type, created_at")
        .eq("application_id", app.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      const latest = latestMessages?.[0] || null;

      // Unread count (messages NOT from me, NOT read)
      const { count: unreadCount } = await supabaseAdmin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("application_id", app.id)
        .is("read_at", null)
        .is("deleted_at", null)
        .neq("sender_id", user.id);

      // Resolve listing + employer (handle Supabase join shapes)
      const listing = Array.isArray(app.job_listings)
        ? app.job_listings[0]
        : app.job_listings;
      const employer = listing
        ? Array.isArray(listing.employers)
          ? listing.employers[0]
          : listing.employers
        : null;

      // Get first name / full name if disclosure allows (for employer view)
      let firstName: string | undefined;
      let fullName: string | undefined;

      if (!isSeeker && app.disclosure_level >= 2) {
        const { data: userProfile } = await supabaseAdmin
          .from("user_profiles")
          .select("full_name")
          .eq("id", app.user_id)
          .maybeSingle();

        if (userProfile?.full_name) {
          firstName = userProfile.full_name.split(" ")[0] || undefined;
          if (app.disclosure_level >= 3) {
            fullName = userProfile.full_name;
          }
        }
      }

      return {
        application_id: app.id,
        pseudonym: app.pseudonym,
        disclosure_level: app.disclosure_level,
        status: app.status,
        first_name: firstName,
        full_name: fullName,
        listing_title: listing?.title || "Unknown",
        listing_slug: listing?.slug || "",
        company_name: employer?.company_name || "Unknown",
        tier_level: employer?.tier_level || 3,
        logo_url: employer?.logo_url || null,
        last_message_text: latest?.message_text || null,
        last_message_at: latest?.created_at || null,
        last_message_sender_type: latest?.sender_type || null,
        unread_count: unreadCount || 0,
      };
    })
  );

  // Sort by most recent message activity
  threads.sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });

  return NextResponse.json({ ok: true, threads });
});
