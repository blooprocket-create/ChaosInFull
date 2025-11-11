import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensureCharacterTable, ensureCharacterSkillExpColumns } from "@/src/lib/db";
import { deriveSkillProgressFromExp } from "@/src/lib/skills";

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

  // Ownership check and atomic increment
  try {
    let updated: { val: number }[] = [];
    switch (skill) {
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
