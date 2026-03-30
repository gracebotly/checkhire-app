import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let displayName = slug;
  let trustBadge = "new";
  let dealsCount = 0;
  let avgRating = "";

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?profile_slug=eq.${slug}&select=display_name,trust_badge,completed_deals_count,average_rating`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        }
      );
      const profiles = await res.json();
      if (profiles?.[0]) {
        displayName = profiles[0].display_name || slug;
        trustBadge = profiles[0].trust_badge || "new";
        dealsCount = profiles[0].completed_deals_count || 0;
        avgRating = profiles[0].average_rating
          ? `${Number(profiles[0].average_rating).toFixed(1)} avg rating`
          : "";
      }
    }
  } catch {
    // Use defaults
  }

  const badgeText =
    trustBadge === "established"
      ? "Established"
      : trustBadge === "trusted"
        ? "Trusted"
        : "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          padding: "60px",
          background: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Brand accent bar */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "6px",
            background: "#0d9488",
          }}
        />

        {/* Name */}
        <div
          style={{
            fontSize: "56px",
            color: "#0f172a",
            fontWeight: 700,
          }}
        >
          {displayName}
        </div>

        {/* Badge */}
        {badgeText && (
          <div
            style={{
              display: "flex",
              marginTop: "16px",
              padding: "8px 20px",
              borderRadius: "8px",
              background: "#f0fdfa",
              color: "#0d9488",
              fontSize: "22px",
              fontWeight: 600,
            }}
          >
            {badgeText}
          </div>
        )}

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            marginTop: "24px",
            fontSize: "22px",
            color: "#475569",
          }}
        >
          <span>{dealsCount} gigs completed</span>
          {avgRating && <span>· {avgRating}</span>}
        </div>

        {/* Branding */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            fontSize: "20px",
            color: "#94a3b8",
            fontWeight: 600,
          }}
        >
          CheckHire
        </div>
      </div>
    ),
    { ...size }
  );
}
