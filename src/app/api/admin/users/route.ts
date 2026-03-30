import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyAdmin } from "@/lib/api/verifyAdmin";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(async (req: Request) => {
  const adminCheck = await verifyAdmin();
  if (!adminCheck.ok) return adminCheck.response;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const serviceClient = createServiceClient();

  let query = serviceClient
    .from("user_profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (search) {
    query = query.or(
      `display_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data: users, count, error } = await query;

  if (error)
    return NextResponse.json(
      { ok: false, code: "DB_ERROR", message: error.message },
      { status: 500 }
    );

  return NextResponse.json({
    ok: true,
    users: users || [],
    total: count || 0,
    page,
    pageSize,
  });
});
