// CheckHire Stripe Connect status — Slice 7. Do not implement yet.
export const runtime = "nodejs";

export async function GET() {
  return new Response(JSON.stringify({ error: "Not implemented" }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}
