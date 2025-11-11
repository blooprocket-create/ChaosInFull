import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensureCharacterTable, ensureCharacterSkillExpColumns, ensureCharacterRaceColumn, ensureCharacterStatColumns } from "@/src/lib/db";
import { deriveSkillProgressFromExp } from "@/src/lib/skills";
import { computeRaceStats } from "@/src/lib/races";
import { computeClassStats, combineRaceClass } from "@/src/lib/classes";

// Increment skill XP for a character. For now we support 'mining'.
// POST { characterId: string, skill: 'mining', amount: number }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { characterId, skill, amount } = body as { characterId?: string; skill?: string; amount?: number };
  if (!characterId || !skill || typeof amount !== 'number') {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  if (amount <= 0) return NextResponse.json({ ok: false, error: "non_positive" }, { status: 400 });

  await ensureCharacterTable();
  await ensureCharacterSkillExpColumns();
  await ensureCharacterRaceColumn();
  await ensureCharacterStatColumns();

  // Ownership check and atomic increment
  try {
    let updated: { val: number }[] = [];
    switch (skill) {
      case 'character':
      case 'char': {
        // Atomically increment char_exp and fetch race for stat scaling
        const rows = await q<{ val: string; race: string | null; class: string }>`
          update "Character"
          set char_exp = GREATEST(0, COALESCE(char_exp, 0) + ${amount})
          where id = ${characterId} and userid = ${session.userId}
          returning char_exp::text as val, race, class
        `;
        if (!rows.length) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
        const totalExp = Number(rows[0].val || 0);
        const prog = deriveSkillProgressFromExp(totalExp);
        // Derive new base stats from race definition (base + perLevel * (level-1))
        const race = rows[0].race;
        const klass = rows[0].class;
        const raceStats = computeRaceStats(race, prog.level);
        const classStats = computeClassStats(klass, prog.level);
        const combined = combineRaceClass(raceStats, classStats);
        // Round down to integers for DB columns
        const stats = {
          str: Math.floor(combined.str),
          int: Math.floor(combined.int),
          agi: Math.floor(combined.agi),
          luk: Math.floor(combined.luk)
        };
        // Persist level and recalculated stats
        await q`update "Character" set level = ${prog.level}, str = ${stats.str}, int = ${stats.int}, agi = ${stats.agi}, luk = ${stats.luk} where id = ${characterId} and userid = ${session.userId}`;
        return NextResponse.json({ ok: true, skill: 'character', progress: prog, level: prog.level, stats });
      }
      case 'mining':
        updated = await q<{ val: number }>`
          update "Character"
          set mining_exp = GREATEST(0, COALESCE(mining_exp, 0) + ${amount})
          where id = ${characterId} and userid = ${session.userId}
          returning COALESCE(mining_exp, 0) as val
        `;
        break;
      case 'woodcutting':
        updated = await q<{ val: number }>`
          update "Character"
          set woodcutting_exp = GREATEST(0, COALESCE(woodcutting_exp, 0) + ${amount})
          where id = ${characterId} and userid = ${session.userId}
          returning COALESCE(woodcutting_exp, 0) as val
        `;
        break;
      case 'fishing':
        updated = await q<{ val: number }>`
          update "Character"
          set fishing_exp = GREATEST(0, COALESCE(fishing_exp, 0) + ${amount})
          where id = ${characterId} and userid = ${session.userId}
          returning COALESCE(fishing_exp, 0) as val
        `;
        break;
      case 'cooking':
        updated = await q<{ val: number }>`
          update "Character"
          set cooking_exp = GREATEST(0, COALESCE(cooking_exp, 0) + ${amount})
          where id = ${characterId} and userid = ${session.userId}
          returning COALESCE(cooking_exp, 0) as val
        `;
        break;
      case 'smithing':
        updated = await q<{ val: number }>`
          update "Character"
          set smithing_exp = GREATEST(0, COALESCE(smithing_exp, 0) + ${amount})
          where id = ${characterId} and userid = ${session.userId}
          returning COALESCE(smithing_exp, 0) as val
        `;
        break;
      default:
        return NextResponse.json({ ok: false, error: 'unsupported_skill' }, { status: 400 });
    }
    if (!updated.length) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    const progress = deriveSkillProgressFromExp(updated[0].val);
    return NextResponse.json({ ok: true, skill, progress });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[xp_route_error]', { characterId, skill, amount, message });
    return NextResponse.json({ ok: false, error: 'db_error', message }, { status: 500 });
  }
}
