import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GigPageClient } from "@/components/gig/GigPageClient";
import { Navbar } from "@/components/layout/Navbar";
import { ToastProvider } from "@/components/ui/toast";
import type { Metadata } from "next";
import type { ActivityLogEntryWithUser, Milestone, Rating, DealInterest, DealInterestWithUser } from "@/types/database";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ funded?: string }>;
};

async function fetchDealBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select(
      `*, client:user_profiles!deals_client_user_id_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug), freelancer:user_profiles!deals_freelancer_user_id_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug, stripe_onboarding_complete)`
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
  const { funded } = await searchParams;
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

  let milestones: Milestone[] = [];
  let activity: ActivityLogEntryWithUser[] = [];

  if (role !== "visitor") {
    const { data: ms } = await supabase
      .from("milestones")
      .select("*")
      .eq("deal_id", deal.id)
      .order("position", { ascending: true });
    milestones = (ms || []) as Milestone[];

    const { data: acts } = await supabase
      .from("deal_activity_log")
      .select(
        `*, user:user_profiles!deal_activity_log_user_id_fkey(display_name, avatar_url)`
      )
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: true });
    activity = (acts || []) as ActivityLogEntryWithUser[];

    const fileEntries = activity.filter(
      (entry) => entry.entry_type === "file" && entry.file_url
    );

    for (const entry of fileEntries) {
      const { data: signed } = await supabase.storage
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

  // Fetch interest data for public deals
  let interests: DealInterestWithUser[] = [];
  let userInterest: DealInterest | null = null;

  if (deal.deal_type === "public") {
    if (role === "client") {
      // Client sees all interest entries
      const { data: interestData } = await supabase
        .from("deal_interest")
        .select(
          "*, user:user_profiles!deal_interest_user_id_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug)"
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
          />
        </main>
      </div>
    </ToastProvider>
  );
}
