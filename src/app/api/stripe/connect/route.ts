// CheckHire Stripe Connect Express onboarding for freelancers — Slice 2. Do not implement yet.
export const runtime = "nodejs";

export async function POST() {
  return new Response(JSON.stringify({ error: "Not implemented — Slice 2" }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}
