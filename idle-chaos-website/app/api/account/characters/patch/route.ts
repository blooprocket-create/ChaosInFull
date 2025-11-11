import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensureCharacterTable, ensureCharacterLastSeenColumn, ensureCharacterTalentsColumn, ensureCharacterGoldColumn, ensureCharacterEquipmentColumn, ensureCharacterSceneColumns, ensureCharacterFlagsColumn } from "@/src/lib/db";

// Flexible patch update for character fields
// Accepts ANY fields from the client and merges them into the JSONB 'data' column
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  
  const body = await req.json().catch(() => ({}));
  const { characterId, ...patchData } = body as { characterId?: string; [key: string]: unknown };

  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  await ensureCharacterTable();
  await ensureCharacterLastSeenColumn();
  await ensureCharacterSceneColumns();
  await ensureCharacterFlagsColumn();
  await ensureCharacterTalentsColumn();
  await ensureCharacterGoldColumn();
  await ensureCharacterEquipmentColumn();

  // Ownership check
  const owned = await q<{ id: string }>`
    select id from "Character" 
    where id = ${characterId} and userid = ${session.userId} 
    limit 1
  `;
  if (!owned.length) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  // If talents provided in patch, update talents column and remove from JSONB merge payload
  // Use const (object is still mutable if needed but we never reassign the reference)
  const mergedPatch = { ...patchData } as Record<string, unknown>;
  const incomingTalents = mergedPatch.talents as unknown;
  const hasTalents = incomingTalents && typeof incomingTalents === 'object';
  if (hasTalents) {
    try {
      await q`
        update "Character"
        set talents = ${JSON.stringify(incomingTalents as Record<string, unknown>)}::jsonb, lastseenat = now()
        where id = ${characterId} and userid = ${session.userId}
      `;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Character talents patch error:', message);
      // continue to process rest of patch even if talents fails
    }
    delete mergedPatch.talents;
  }

  // If gold provided in patch, update dedicated gold column and remove from JSONB merge payload
  const incomingGold = mergedPatch.gold as unknown;
  const hasGold = typeof incomingGold === 'number' && Number.isFinite(incomingGold as number);
  if (hasGold) {
    const safeGold = Math.max(0, Math.floor(incomingGold as number));
    try {
      await q`
        update "Character"
        set gold = ${safeGold}, lastseenat = now()
        where id = ${characterId} and userid = ${session.userId}
      `;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Character gold patch error:', message);
      // continue even if gold update fails
    }
    delete mergedPatch.gold;
  }
  // Update positional and scene fields if provided (currentScene, lastX, lastY)
  // Accept both currentScene (preferred) and lastScene (legacy) from clients
  const currentScene = typeof mergedPatch.currentScene === 'string'
    ? (mergedPatch.currentScene as string)
    : (typeof (mergedPatch as Record<string, unknown>).lastScene === 'string' ? ((mergedPatch as Record<string, unknown>).lastScene as string) : undefined);
  const lastX = typeof mergedPatch.lastX === 'number' && Number.isFinite(mergedPatch.lastX as number) ? (mergedPatch.lastX as number) : undefined;
  const lastY = typeof mergedPatch.lastY === 'number' && Number.isFinite(mergedPatch.lastY as number) ? (mergedPatch.lastY as number) : undefined;
  if (currentScene !== undefined || lastX !== undefined || lastY !== undefined) {
    try {
      await q`
        update "Character"
        set currentscene = ${currentScene ?? null}, lastx = ${lastX ?? null}, lasty = ${lastY ?? null}, lastseenat = now()
        where id = ${characterId} and userid = ${session.userId}
      `;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Character position patch error:', message);
      return NextResponse.json({ ok: false, error: "db_error", message }, { status: 500 });
    }
    delete mergedPatch.currentScene;
    delete (mergedPatch as Record<string, unknown>).lastScene;
    delete (mergedPatch as Record<string, unknown>).lastX;
    delete (mergedPatch as Record<string, unknown>).lastY;
  }

  // Update flags JSONB if provided (merge shallow by replacement for now)
  // Flags merge: support a shallow merge when an object is provided instead of wholesale replacement
  const incomingFlags = mergedPatch.flags as unknown;
  if (incomingFlags && typeof incomingFlags === 'object') {
    try {
      // Fetch existing flags to merge (avoid overwriting other progression markers inadvertently)
      const existing = await q<{ flags: Record<string, unknown> | null }>`
        select flags from "Character" where id = ${characterId} and userid = ${session.userId} limit 1
      `;
      const prev = (existing.length && existing[0].flags && typeof existing[0].flags === 'object') ? existing[0].flags : {};
      const merged = { ...prev, ...(incomingFlags as Record<string, unknown>) };
      await q`
        update "Character"
        set flags = ${JSON.stringify(merged)}::jsonb, lastseenat = now()
        where id = ${characterId} and userid = ${session.userId}
      `;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Character flags patch error:', message);
      return NextResponse.json({ ok: false, error: "db_error", message }, { status: 500 });
    }
    delete mergedPatch.flags;
  }

  // If equipment provided, update equipment JSONB column directly
  const incomingEquipment = mergedPatch.equipment as unknown;
  if (incomingEquipment && typeof incomingEquipment === 'object') {
    try {
      await q`
        update "Character"
        set equipment = ${JSON.stringify(incomingEquipment as Record<string, unknown>)}::jsonb, lastseenat = now()
        where id = ${characterId} and userid = ${session.userId}
      `;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Character equipment patch error:', message);
      return NextResponse.json({ ok: false, error: "db_error", message }, { status: 500 });
    }
    delete mergedPatch.equipment;
  }

  // Any leftover fields are currently ignored to keep server state explicit

  return NextResponse.json({ ok: true });
}
