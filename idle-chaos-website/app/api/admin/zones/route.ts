import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

export async function GET() {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const rows = await q<{ id: string; name: string; scenekey: string; width: number; height: number }>`
    select id, name, scenekey, width, height from "ZoneDef" order by id asc
  `;
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof b.id !== 'string' || typeof b.name !== 'string' || typeof b.sceneKey !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }
  const width = typeof b.width === 'number' ? b.width : 800;
  const height = typeof b.height === 'number' ? b.height : 600;
  const rows = await q<{ id: string; name: string; scenekey: string; width: number; height: number }>`
    insert into "ZoneDef" (id, name, scenekey, width, height)
    values (${b.id}, ${b.name}, ${b.sceneKey}, ${width}, ${height})
    on conflict (id) do update set name = excluded.name, scenekey = excluded.scenekey, width = excluded.width, height = excluded.height
    returning id, name, scenekey, width, height
  `;
  return NextResponse.json({ ok: true, row: rows[0] });
}
