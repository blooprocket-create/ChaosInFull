import { NextRequest, NextResponse } from "next/server";
import { q } from "@/src/lib/db";
import { getSession } from "@/src/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const stacks = await q<{ itemkey: string; count: number }>`select itemkey, count from "AccountItemStack" where userid = ${session.userId}`;
  const items: Record<string, number> = {};
  for (const s of stacks) items[s.itemkey] = s.count;
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { items?: Record<string, number> } | null;
  if (!body || typeof body.items !== "object") return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const items = body.items as Record<string, number>;
  for (const [key, count] of Object.entries(items)) {
    if (typeof count !== "number") continue;
    if (count <= 0) {
      await q`delete from "AccountItemStack" where userid = ${session.userId} and itemkey = ${key}`;
    } else {
      await q`insert into "AccountItemStack" (userid, itemkey, count)
              values (${session.userId}, ${key}, ${count})
              on conflict (userid, itemkey) do update set count = excluded.count`;
    }
  }
  return NextResponse.json({ ok: true });
}
