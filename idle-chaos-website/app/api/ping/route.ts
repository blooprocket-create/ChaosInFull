import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const now = Date.now();
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  // Try to reflect Vercel region (or fallback)
  const headerId = (request.headers.get("x-vercel-id") || "").split(":");
  const regionFromHeader = headerId.length > 1 ? headerId[0] : undefined;
  const region = process.env.VERCEL_REGION || regionFromHeader || "local";
  const start = since ? Number(since) : undefined;
  const rtt = typeof start === "number" && !Number.isNaN(start) ? Math.max(0, now - start) : undefined;
  return NextResponse.json({ ok: true, region, serverTime: now, rtt });
}
