import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { TrustBadge } from "@/components/gig/TrustBadge";
import type { Metadata } from "next";
import type { TrustBadge as TrustBadgeType } from "@/types/database";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getProfile(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profiles")
    .select(
      "display_name, avatar_url, bio, trust_badge, completed_deals_count, average_rating, profile_slug, created_at"
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
    description: `${profile.trust_badge} • ${profile.completed_deals_count} gigs completed`,
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

  if (!profile) {
    notFound();
  }

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
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {profile.completed_deals_count} gigs completed
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {profile.average_rating
              ? `${Number(profile.average_rating).toFixed(1)} avg rating`
              : "No ratings yet"}
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-600">
        Member since {memberSince}
      </p>

      {/* Completed Gigs placeholder */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-slate-900">
          Completed Gigs
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          No completed gigs yet
        </p>
      </div>

      {/* Ratings placeholder */}
      <div className="mt-8">
        <h2 className="text-base font-semibold text-slate-900">
          Ratings
        </h2>
        <p className="mt-2 text-sm text-slate-600">No ratings yet</p>
      </div>
    </div>
  );
}
