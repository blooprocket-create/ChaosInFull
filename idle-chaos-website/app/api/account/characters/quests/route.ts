import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensureCharacterTable, ensureCharacterQuestTable } from "@/src/lib/db";

// Upsert quest state for a character.
// POST: { characterId, active: [{ id, progress: [...] }], completed: [id, ...] }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { characterId, active, completed } = body as {
    characterId?: string;
    active?: Array<{ id: string; progress?: unknown }>;
    completed?: string[];
  };
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  await ensureCharacterTable();
  await ensureCharacterQuestTable();

  // Owner check
  const owner = await q<{ id: string }>`select id from "Character" where id = ${characterId} and userid = ${session.userId} limit 1`;
  if (!owner.length) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  try {
    // Upsert active quests
    if (Array.isArray(active)) {
      for (const a of active) {
        if (!a || !a.id) continue;
        await q`
          insert into "CharacterQuest" (characterid, questid, status, progress, updatedat)
          values (${characterId}, ${a.id}, 'active', ${a.progress ?? null}, now())
          on conflict (characterid, questid) do update set status = excluded.status, progress = excluded.progress, updatedat = now()
        `;
      }
    }
    // Upsert completed quests
    if (Array.isArray(completed)) {
      for (const id of completed) {
        if (!id) continue;
        await q`
          insert into "CharacterQuest" (characterid, questid, status, progress, updatedat)
          values (${characterId}, ${id}, 'completed', null, now())
          on conflict (characterid, questid) do update set status = excluded.status, progress = excluded.progress, updatedat = now()
        `;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: "db_error", message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Fetch a snapshot for UI sync
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("characterId") || undefined;
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  await ensureCharacterTable();
  await ensureCharacterQuestTable();
  const owner = await q<{ id: string }>`select id from "Character" where id = ${characterId} and userid = ${session.userId} limit 1`;
  if (!owner.length) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const rows = await q<{ questid: string; status: string; progress: unknown }>`
    select questid, status, progress from "CharacterQuest" where characterid = ${characterId}
  `;
  const active: Array<{ id: string; progress?: unknown }> = [];
  const completed: string[] = [];
  for (const r of rows) {
    if (r.status === 'completed') completed.push(r.questid);
    else active.push({ id: r.questid, progress: r.progress });
  }
  return NextResponse.json({ ok: true, active, completed });
}
