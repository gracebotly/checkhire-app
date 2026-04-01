import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { withApiHandler } from "@/lib/api/withApiHandler";

const PAGE_SIZE = 30;

// These substrings identify payment-related system log entries
// written by the Stripe webhook handler
const PAYMENT_KEYWORDS = [
  "funded",
  "Escrow funded",
  "Milestone",
  "Refund",
  "Chargeback",
  "Payout",
  "Checkout session expired",
  "Bank transfer",
  "auto-release",
  "auto-refund",
  "frozen by bank",
];

export const GET = withApiHandler(async (req: Request) => {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const filter = url.searchParams.get("filter") || "all";
  const offset = (page - 1) * PAGE_SIZE;

  const serviceClient = createServiceClient();

  // Build OR filter for payment keywords
  const keywordFilters = PAYMENT_KEYWORDS.map(
    (kw) => `content.ilike.%${kw}%`
  ).join(",");

  let query = serviceClient
    .from("deal_activity_log")
    .select(
      `id, deal_id, content, created_at, deal:deals!inner(title, deal_link_slug, total_amount, escrow_status, status)`,
      { count: "exact" }
    )
    .eq("entry_type", "system")
    .or(keywordFilters);

  // Apply sub-filters
  if (filter === "funded") {
    query = query.ilike("content", "%funded%");
  } else if (filter === "refunds") {
    query = query.or("content.ilike.%Refund%,content.ilike.%auto-refund%");
  } else if (filter === "chargebacks") {
    query = query.ilike("content", "%Chargeback%");
  } else if (filter === "failures") {
    query = query.or(
      "content.ilike.%failed%,content.ilike.%expired%,content.ilike.%Payout%"
    );
  }

  const { data: entries, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    entries: entries || [],
    total: count || 0,
    page,
    pageSize: PAGE_SIZE,
  });
});
