import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { submitRatingSchema } from "@/lib/validation/ratings";

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json(
        { ok: false, code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );

    const body = await req.json();
    const parsed = submitRatingSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid input",
        },
        { status: 400 }
      );

    const { stars, comment } = parsed.data;

    // Fetch the deal
    const { data: deal } = await supabase
      .from("deals")
      .select("id, status, client_user_id, freelancer_user_id")
      .eq("id", id)
      .maybeSingle();

    if (!deal)
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Deal not found" },
        { status: 404 }
      );

    if (deal.status !== "completed")
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_STATUS",
          message: "Ratings can only be submitted for completed gigs",
        },
        { status: 400 }
      );

    // Verify user is a participant
    const isClient = deal.client_user_id === user.id;
    const isFreelancer = deal.freelancer_user_id === user.id;
    if (!isClient && !isFreelancer)
      return NextResponse.json(
        { ok: false, code: "FORBIDDEN", message: "You are not a participant in this gig" },
        { status: 403 }
      );

    // Check if already rated
    const { data: existingRating } = await supabase
      .from("ratings")
      .select("id")
      .eq("deal_id", id)
      .eq("rater_user_id", user.id)
      .maybeSingle();

    if (existingRating)
      return NextResponse.json(
        { ok: false, code: "ALREADY_RATED", message: "You have already rated this gig" },
        { status: 400 }
      );

    // Determine who is being rated
    const ratedUserId = isClient ? deal.freelancer_user_id! : deal.client_user_id;
    const role = isClient ? "client" : "freelancer";

    // Insert rating
    const { data: rating, error: insertError } = await supabase
      .from("ratings")
      .insert({
        deal_id: id,
        rater_user_id: user.id,
        rated_user_id: ratedUserId,
        stars,
        comment: comment?.trim() || null,
        role,
      })
      .select()
      .single();

    if (insertError)
      return NextResponse.json(
        { ok: false, code: "DB_ERROR", message: insertError.message },
        { status: 500 }
      );

    // Recalculate the rated user's average_rating using service client
    const serviceClient = createServiceClient();
    const { data: avgResult } = await serviceClient
      .from("ratings")
      .select("stars")
      .eq("rated_user_id", ratedUserId);

    if (avgResult && avgResult.length > 0) {
      const avg =
        avgResult.reduce((sum, r) => sum + r.stars, 0) / avgResult.length;
      await serviceClient
        .from("user_profiles")
        .update({ average_rating: parseFloat(avg.toFixed(2)) })
        .eq("id", ratedUserId);
    }

    return NextResponse.json({ ok: true, rating });
  }
);
