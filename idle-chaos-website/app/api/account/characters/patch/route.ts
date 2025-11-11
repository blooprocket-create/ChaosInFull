import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensureCharacterTable, ensureCharacterLastSeenColumn, ensureCharacterTalentsColumn, ensureCharacterGoldColumn, ensureCharacterEquipmentColumn, ensureCharacterSceneColumns, ensureCharacterFlagsColumn, ensureCharacterStatColumns, ensureCharacterRaceColumn } from "@/src/lib/db";
import { computeRaceStats } from "@/src/lib/races";
import { computeClassStats, combineRaceClass } from "@/src/lib/classes";

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
  await ensureCharacterStatColumns();
  await ensureCharacterRaceColumn();

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
      // Only update provided fields; if a value isn't provided, keep the existing DB value.
      // Using COALESCE(null, column) preserves the current value when undefined/null was sent.
      await q`
        update "Character"
        set currentscene = coalesce(${currentScene ?? null}::text, currentscene),
            lastx        = coalesce(${lastX ?? null}::double precision, lastx),
            lasty        = coalesce(${lastY ?? null}::double precision, lasty),
            lastseenat   = now()
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

  // Handle class + stat updates (class change triggers recompute client-side; allow direct persistence of class & stats)
  const incomingClass = typeof mergedPatch.class === 'string' ? String(mergedPatch.class).trim() : undefined;
  const incomingStats = mergedPatch.stats as unknown;
  if (incomingClass) {
    try {
      // Fetch current level and race for server-side stat recompute
      const rows = await q<{ level: number; race: string | null }>`
        select level, race from "Character" where id = ${characterId} and userid = ${session.userId} limit 1
      `;
      const level = rows.length ? Math.max(1, Number(rows[0].level || 1)) : 1;
      const race = rows.length ? (rows[0].race || null) : null;
      const raceStats = computeRaceStats(race, level);
      const classStats = computeClassStats(incomingClass, level);
      const combined = combineRaceClass(raceStats, classStats);
      const stats = {
        str: Math.floor(combined.str || 0),
        int: Math.floor(combined.int || 0),
        agi: Math.floor(combined.agi || 0),
        luk: Math.floor(combined.luk || 0)
      };
      await q`
        update "Character"
        set class = ${incomingClass},
            str = ${stats.str},
            int = ${stats.int},
            agi = ${stats.agi},
            luk = ${stats.luk},
            lastseenat = now()
        where id = ${characterId} and userid = ${session.userId}
      `;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Character class patch error:', message);
    }
    delete mergedPatch.class;
    // If client also sent stats, drop them since we recomputed server-side
    if (mergedPatch.stats) delete mergedPatch.stats;
  }
  if (incomingStats && typeof incomingStats === 'object') {
    try {
      const s = incomingStats as Record<string, unknown>;
      const vStr = (typeof s.str === 'number' && Number.isFinite(s.str)) ? Math.max(0, Math.floor(s.str as number)) : null;
      const vInt = (typeof s.int === 'number' && Number.isFinite(s.int)) ? Math.max(0, Math.floor(s.int as number)) : null;
      const vAgi = (typeof s.agi === 'number' && Number.isFinite(s.agi)) ? Math.max(0, Math.floor(s.agi as number)) : null;
      const vLuk = (typeof s.luk === 'number' && Number.isFinite(s.luk)) ? Math.max(0, Math.floor(s.luk as number)) : null;
      await q`
        update "Character"
        set str = coalesce(${vStr}::int, str),
            int = coalesce(${vInt}::int, int),
            agi = coalesce(${vAgi}::int, agi),
            luk = coalesce(${vLuk}::int, luk),
            lastseenat = now()
        where id = ${characterId} and userid = ${session.userId}
      `;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Character stat patch error:', message);
    }
    delete mergedPatch.stats;
  }

  // Any leftover fields are currently ignored to keep server state explicit

  return NextResponse.json({ ok: true });
}
