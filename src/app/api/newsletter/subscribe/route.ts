import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  utmCampaign: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "invalid_input" },
        { status: 400 }
      );
    }

    const { email, utmCampaign } = parsed.data;

    const apiKey = process.env.BEEHIIV_API_KEY;
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

    if (!apiKey || !publicationId) {
      return NextResponse.json(
        { success: false, error: "subscription_failed" },
        { status: 500 }
      );
    }

    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          reactivate_existing: false,
          send_welcome_email: true,
          utm_source: "checkhire",
          utm_medium: "website",
          utm_campaign: utmCampaign,
          referring_site: "https://checkhire.co",
        }),
      }
    );

    if (res.status === 200 || res.status === 201) {
      return NextResponse.json({ success: true });
    }

    if (res.status === 409) {
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }

    // Check response body for "already exists" indicators
    try {
      const data = await res.json();
      if (data?.data?.status === "active" || data?.data?.status === "validating") {
        return NextResponse.json({ success: true, alreadySubscribed: true });
      }
    } catch {
      // ignore parse errors
    }

    return NextResponse.json(
      { success: false, error: "subscription_failed" },
      { status: 502 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "subscription_failed" },
      { status: 500 }
    );
  }
}
