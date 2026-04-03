import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { GigPageClientV2 as GigPageClient } from "@/components/gig/GigPageClientV2";
import { Navbar } from "@/components/layout/Navbar";
import { ToastProvider } from "@/components/ui/toast";
import { verifyGuestToken } from "@/lib/deals/guestToken";
import type { Metadata } from "next";
import type { ActivityLogEntryWithUser, Milestone, Rating, DealInterest, DealInterestWithUser, AcceptanceCriteria } from "@/types/database";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ funded?: string; guest_token?: string; accept?: string }>;
};

async function fetchDealBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select(
      `*, client:user_profiles!deals_client_user_id_profile_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug), freelancer:user_profiles!deals_freelancer_user_id_profile_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug, stripe_onboarding_complete)`
    )
    .eq("deal_link_slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const deal = await fetchDealBySlug(slug);
  if (!deal) return { title: "Gig Not Found" };
  const amount = (deal.total_amount / 100).toFixed(2);
  return {
    title: `${deal.title} — $${amount} | CheckHire`,
    description: `Escrow-protected gig. ${deal.deliverables?.slice(0, 120) || deal.description.slice(0, 120)}`,
    openGraph: {
      title: `${deal.title} — $${amount}`,
      description:
        "Secure escrow payment for gig work on CheckHire",
    },
  };
}

export default async function DealPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { funded, guest_token, accept } = await searchParams;
  const supabase = await createClient();

  // Fetch deal
  const deal = await fetchDealBySlug(slug);
  if (!deal) notFound();

  // Determine viewer role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: "client" | "freelancer" | "visitor" = "visitor";
  if (user) {
    if (deal.client_user_id === user.id) role = "client";
    else if (deal.freelancer_user_id === user.id) role = "freelancer";
  }

  // Guest token verification
  let validGuestToken: string | null = null;
  let guestFreelancerName: string | null = null;
  if (guest_token && deal.guest_freelancer_email) {
    if (verifyGuestToken(guest_token, deal.id, deal.guest_freelancer_email)) {
      validGuestToken = guest_token;
      guestFreelancerName = deal.guest_freelancer_name || null;
      if (role === "visitor") role = "freelancer";
    }
  }

  // Handle ?accept=true for OAuth return flow
  if (user && accept === "true" && role !== "client") {
    if (
      deal.status === "pending_acceptance" &&
      !deal.freelancer_user_id &&
      !deal.guest_freelancer_email &&
      deal.client_user_id !== user.id
    ) {
      // Auto-accept is handled by the by-slug API route
      // The server component just passes accept=true through
      // which the API already handled. Refresh to get updated data.
    }
  }

  let milestones: Milestone[] = [];
  let acceptanceCriteria: AcceptanceCriteria[] = [];
  let activity: ActivityLogEntryWithUser[] = [];

  // Fetch acceptance criteria
  const { data: criteria } = await supabase
    .from("acceptance_criteria")
    .select("*")
    .eq("deal_id", deal.id)
    .order("position", { ascending: true });
  acceptanceCriteria = (criteria || []) as AcceptanceCriteria[];

  if (role !== "visitor") {
    // Use service client for guest freelancers (no auth session)
    const queryClient = validGuestToken ? createServiceClient() : supabase;

    const { data: ms } = await queryClient
      .from("milestones")
      .select("*")
      .eq("deal_id", deal.id)
      .order("position", { ascending: true });
    milestones = (ms || []) as Milestone[];

    const { data: acts } = await queryClient
      .from("deal_activity_log")
      .select(
        `*, user:user_profiles!deal_activity_log_user_id_profile_fkey(display_name, avatar_url)`
      )
      .eq("deal_id", deal.id)
      .is("interest_id", null)
      .order("created_at", { ascending: true });
    activity = (acts || []) as ActivityLogEntryWithUser[];

    const fileEntries = activity.filter(
      (entry) => entry.entry_type === "file" && entry.file_url
    );

    const signClient = validGuestToken ? createServiceClient() : supabase;
    for (const entry of fileEntries) {
      const { data: signed } = await signClient.storage
        .from("deal-files")
        .createSignedUrl(entry.file_url as string, 60 * 15);

      if (signed?.signedUrl) {
        entry.file_url = signed.signedUrl;
      }
    }
  }

  // Fetch ratings for completed deals
  let userRating: Rating | null = null;
  let otherRating: Rating | null = null;
  if (role !== "visitor" && deal.status === "completed") {
    const { data: dealRatings } = await supabase
      .from("ratings")
      .select("*")
      .eq("deal_id", deal.id);

    if (dealRatings) {
      userRating = dealRatings.find((r) => r.rater_user_id === user!.id) || null;
      otherRating = dealRatings.find((r) => r.rater_user_id !== user!.id) || null;
    }
  }

  // Fetch active dispute
  let disputeId: string | null = null;
  if (role !== "visitor") {
    const { data: activeDispute } = await supabase
      .from("disputes")
      .select("id")
      .eq("deal_id", deal.id)
      .in("status", ["open", "under_review"])
      .maybeSingle();
    disputeId = activeDispute?.id || null;
  }

  // Fetch interest data for public deals
  let interests: DealInterestWithUser[] = [];
  let userInterest: DealInterest | null = null;

  if (deal.deal_type === "public") {
    if (role === "client") {
      // Client sees all interest entries
      const { data: interestData } = await supabase
        .from("deal_interest")
        .select(
          "*, user:user_profiles!deal_interest_user_id_profile_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug)"
        )
        .eq("deal_id", deal.id)
        .order("created_at", { ascending: false });
      interests = (interestData || []) as DealInterestWithUser[];
    } else if (user && role === "visitor") {
      // Non-client authenticated visitor sees only their own interest
      const { data: ownInterest } = await supabase
        .from("deal_interest")
        .select("*")
        .eq("deal_id", deal.id)
        .eq("user_id", user.id)
        .maybeSingle();
      userInterest = ownInterest;
    }
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main>
          <GigPageClient
            deal={deal}
            milestones={milestones}
            activity={activity}
            role={role}
            currentUserId={user?.id || null}
            fundedStatus={funded || null}
            userRating={userRating}
            otherRating={otherRating}
            interests={interests}
            userInterest={userInterest}
            disputeId={disputeId}
            guestFreelancerName={guestFreelancerName}
            guestToken={validGuestToken}
            acceptanceCriteria={acceptanceCriteria || []}
          />
        </main>
      </div>
    </ToastProvider>
  );
}
