import { NextResponse } from "next/server";
import { getEmployerForUser } from "@/lib/employer/getEmployerForUser";
import { withApiHandler } from "@/lib/api/withApiHandler";
import { calculateTransparencyScore } from "@/lib/employer/transparencyScore";

export const runtime = "nodejs";

/**
 * GET /api/employer/transparency-score
 *
 * Returns the current employer's transparency score with full breakdown.
 * Each component is visible so the employer understands what drives their score.
 */
export const GET = withApiHandler(async function GET() {
  const ctx = await getEmployerForUser();

  if (!ctx) {
    return NextResponse.json(
      { ok: false, code: "NOT_EMPLOYER", message: "No employer account found." },
      { status: 403 }
    );
  }

  const breakdown = await calculateTransparencyScore(ctx.employerId);

  return NextResponse.json({
    ok: true,
    score: breakdown,
  });
});
