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
    const colMap: Record<string, string> = {
      mining: 'mining_exp',
      woodcutting: 'woodcutting_exp',
      fishing: 'fishing_exp',
      cooking: 'cooking_exp',
      smithing: 'smithing_exp',
    };
    const col = colMap[String(skill) as keyof typeof colMap];
    if (!col) return NextResponse.json({ ok: false, error: "unsupported_skill" }, { status: 400 });
    // Use string interpolation cautiously (column name is validated via colMap above)
    const updated = await q<{ val: number }>`
      update "Character"
      set ${col} = GREATEST(0, COALESCE(${col}, 0) + ${amount})
      where id = ${characterId} and userid = ${session.userId}
      returning COALESCE(${col}, 0) as val
    `;
    if (!updated.length) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    const progress = deriveSkillProgressFromExp(updated[0].val);
    return NextResponse.json({ ok: true, skill, progress });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: "db_error", message }, { status: 500 });
  }
}
