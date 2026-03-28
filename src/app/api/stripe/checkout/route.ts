// CheckHire listing payment — Slice 6. Do not implement yet.
export const runtime = "nodejs";

export async function POST() {
  return new Response(JSON.stringify({ error: "Not implemented" }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
}
