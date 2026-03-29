import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GigPageClient } from "@/components/gig/GigPageClient";
import { Navbar } from "@/components/layout/Navbar";
import { ToastProvider } from "@/components/ui/toast";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

async function fetchDealBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select(
      `*, client:user_profiles!deals_client_user_id_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug), freelancer:user_profiles!deals_freelancer_user_id_fkey(display_name, avatar_url, trust_badge, completed_deals_count, average_rating, profile_slug)`
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

export default async function DealPage({ params }: Props) {
  const { slug } = await params;
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

  let milestones: Awaited<ReturnType<typeof supabase.from>>[] = [];
  let activity: Awaited<ReturnType<typeof supabase.from>>[] = [];

  if (role !== "visitor") {
    const { data: ms } = await supabase
      .from("milestones")
      .select("*")
      .eq("deal_id", deal.id)
      .order("position", { ascending: true });
    milestones = ms || [];

    const { data: acts } = await supabase
      .from("deal_activity_log")
      .select(
        `*, user:user_profiles!deal_activity_log_user_id_fkey(display_name, avatar_url)`
      )
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: true });
    activity = acts || [];
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main>
          <GigPageClient
            deal={deal}
            milestones={milestones as never[]}
            activity={activity as never[]}
            role={role}
            currentUserId={user?.id || null}
          />
        </main>
      </div>
    </ToastProvider>
  );
}
