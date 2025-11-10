import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensureCharacterTable, ensureCharacterExtraColumns, ensureItemStackTable, ensureCharacterQuestTable } from "@/src/lib/db";

// Utility endpoint to fix characters created before schema had extra columns
// GET /api/account/characters/fix-schema
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure all tables and columns exist
    await ensureCharacterTable();
    await ensureCharacterExtraColumns();
    await ensureItemStackTable();
    await ensureCharacterQuestTable();

    // Initialize 'data' column with default values for characters that don't have it
    await q`
      UPDATE "Character"
      SET data = COALESCE(data, '{}'::jsonb)
      WHERE userid = ${session.userId} AND data IS NULL
    `;

    // Return the fixed characters
    const characters = await q<{ id: string; name: string; class: string; level: number; gold: number }>`
      SELECT id, name, class, level, gold
      FROM "Character"
      WHERE userid = ${session.userId}
      ORDER BY name ASC
    `;

    return NextResponse.json({ 
      ok: true, 
      message: `Fixed ${characters.length} character(s)`,
      characters 
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
