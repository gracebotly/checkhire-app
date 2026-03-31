import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { TrustBadge } from "@/components/gig/TrustBadge";
import { StarRating } from "@/components/gig/StarRating";
import { RatingDisplay } from "@/components/gig/RatingDisplay";
import type { Metadata } from "next";
import type { TrustBadge as TrustBadgeType, RatingWithUser } from "@/types/database";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getProfile(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profiles")
    .select(
      "id, display_name, avatar_url, bio, trust_badge, completed_deals_count, average_rating, profile_slug, created_at"
    )
    .eq("profile_slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) return { title: "User Not Found" };
  return {
    title: `${profile.display_name || slug} on CheckHire`,
    description: `${profile.trust_badge} · ${profile.completed_deals_count} gigs completed`,
  };
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function UserProfilePage({ params }: Props) {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) notFound();

  // Fetch ratings received (public read — anyone can see ratings)
  const supabase = await createClient();
  const { data: ratingsData } = await supabase
    .from("ratings")
    .select(
      "*, rater:user_profiles!ratings_rater_user_id_profile_fkey(display_name, avatar_url, profile_slug)"
    )
    .eq("rated_user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const ratings = (ratingsData || []) as RatingWithUser[];

  // Fetch recent completed deals using service client (bypasses participant-only RLS)
  const serviceClient = createServiceClient();
  const { data: dealsData } = await serviceClient
    .from("deals")
    .select(
      "id, title, total_amount, completed_at, deal_link_slug, client_user_id, freelancer_user_id, client:user_profiles!deals_client_user_id_profile_fkey(display_name), freelancer:user_profiles!deals_freelancer_user_id_profile_fkey(display_name)"
    )
    .or(
      `client_user_id.eq.${profile.id},freelancer_user_id.eq.${profile.id}`
    )
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10);

  const recentDeals = (dealsData || []).map((d) => {
    const isClient = d.client_user_id === profile.id;
    const otherParty = isClient
      ? (d.freelancer as unknown as { display_name: string | null })?.display_name
      : (d.client as unknown as { display_name: string | null })?.display_name;
    return {
      id: d.id,
      title: d.title,
      total_amount: d.total_amount,
      completed_at: d.completed_at,
      deal_link_slug: d.deal_link_slug,
      otherPartyName: otherParty || "Unknown",
      roleLabel: isClient ? "as client" : "as freelancer",
    };
  });

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Avatar + Name */}
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-muted text-lg font-semibold text-brand">
            {getInitials(profile.display_name)}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900">
              {profile.display_name || slug}
            </h1>
            <TrustBadge
              badge={profile.trust_badge as TrustBadgeType}
              size="md"
            />
          </div>
          {profile.bio && (
            <p className="mt-1 text-sm text-slate-600">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 flex items-center gap-6">
        <p className="text-sm font-semibold text-slate-900">
          {profile.completed_deals_count} gigs completed
        </p>
        <div className="flex items-center gap-2">
          {profile.average_rating ? (
            <>
              <StarRating
                rating={Number(profile.average_rating)}
                size="sm"
              />
              <span className="text-sm font-semibold text-slate-900">
                {Number(profile.average_rating).toFixed(1)}
              </span>
            </>
          ) : (
            <p className="text-sm text-slate-600">No ratings yet</p>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-600">Member since {memberSince}</p>

      {/* Completed Gigs */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-slate-900">
          Completed Gigs
        </h2>
        {recentDeals.length > 0 ? (
          <div className="mt-3 space-y-3">
            {recentDeals.map((deal) => (
              <a
                key={deal.id}
                href={`/deal/${deal.deal_link_slug}`}
                className="block cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    {deal.title}
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                    ${(deal.total_amount / 100).toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                  <span>with {deal.otherPartyName}</span>
                  <span>·</span>
                  <span>{deal.roleLabel}</span>
                  {deal.completed_at && (
                    <>
                      <span>·</span>
                      <span>
                        {new Date(deal.completed_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </span>
                    </>
                  )}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            No completed gigs yet
          </p>
        )}
      </div>

      {/* Ratings */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-slate-900">Ratings</h2>
        {ratings.length > 0 ? (
          <div className="mt-3 divide-y divide-gray-100">
            {ratings.map((rating) => (
              <RatingDisplay key={rating.id} rating={rating} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No ratings yet</p>
        )}
      </div>
    </div>
  );
}
