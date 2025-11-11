import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensureCharacterTable, ensureCharacterEquipmentColumn, ensureCharacterLastSeenColumn } from "@/src/lib/db";

// POST /api/account/characters/equipment
// Body: { characterId: string, equipment: Record<string, unknown> }
// Replaces the character's equipment JSONB with the provided object (shallow replace),
// after verifying ownership. Returns the stored equipment.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { characterId, equipment } = body as { characterId?: string; equipment?: Record<string, unknown> };
  if (!characterId || typeof equipment !== 'object' || equipment === null) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }
  await ensureCharacterTable();
  await ensureCharacterEquipmentColumn();
  await ensureCharacterLastSeenColumn();

  const owned = await q<{ id: string }>`
    select id from "Character" where id = ${characterId} and userid = ${session.userId} limit 1
  `;
  if (!owned.length) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  try {
    await q`
      update "Character"
      set equipment = ${JSON.stringify(equipment)}::jsonb, lastseenat = now()
      where id = ${characterId} and userid = ${session.userId}
    `;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('equipment update error', message);
    return NextResponse.json({ ok: false, error: 'db_error', message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, equipment });
}
