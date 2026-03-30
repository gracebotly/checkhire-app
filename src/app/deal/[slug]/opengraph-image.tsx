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

  let title = "Gig on CheckHire";
  let amount = "";
  let statusText = "Escrow Protected";
  let clientName = "Client";

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/deals?deal_link_slug=eq.${slug}&select=title,total_amount,escrow_status,deal_type,client_user_id`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        }
      );
      const deals = await res.json();
      const deal = deals?.[0];

      if (deal) {
        title = deal.title;
        amount = `$${(deal.total_amount / 100).toFixed(2)}`;
        statusText =
          deal.escrow_status === "funded"
            ? "Payment Secured"
            : deal.deal_type === "public"
              ? "Open Gig"
              : "Escrow Protected";

        // Fetch client name
        const clientRes = await fetch(
          `${supabaseUrl}/rest/v1/user_profiles?id=eq.${deal.client_user_id}&select=display_name,trust_badge`,
          {
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
            },
          }
        );
        const clients = await clientRes.json();
        if (clients?.[0]) {
          clientName = clients[0].display_name || "Client";
        }
      }
    }
  } catch {
    // Use defaults
  }

  const displayTitle =
    title.length > 60 ? title.slice(0, 57) + "..." : title;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
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

        {/* Top: branding + title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{ fontSize: "24px", color: "#64748b", fontWeight: 600 }}
          >
            CheckHire
          </div>
          <div
            style={{
              fontSize: "48px",
              color: "#0f172a",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {displayTitle}
          </div>
        </div>

        {/* Bottom: amount + status + client */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {amount && (
              <div
                style={{
                  fontSize: "56px",
                  color: "#0f172a",
                  fontWeight: 700,
                  fontFamily: "monospace",
                }}
              >
                {amount}
              </div>
            )}
            <div
              style={{
                display: "flex",
                padding: "8px 20px",
                borderRadius: "8px",
                background: statusText === "Payment Secured" ? "#dcfce7" : "#f0fdfa",
                color: statusText === "Payment Secured" ? "#166534" : "#0d9488",
                fontSize: "18px",
                fontWeight: 600,
              }}
            >
              {statusText}
            </div>
          </div>
          <div
            style={{
              fontSize: "20px",
              color: "#475569",
            }}
          >
            {clientName}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
