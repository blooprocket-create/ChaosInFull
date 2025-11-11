import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensureCharacterTable, ensureItemStackTable, ensureCharacterQuestTable } from "@/src/lib/db";

// Utility endpoint to fix characters created before schema had extra columns
// GET /api/account/characters/fix-schema
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure all tables and columns exist
    await ensureCharacterTable();
    await ensureItemStackTable();
    await ensureCharacterQuestTable();
    // 'data' JSONB column is deprecated; nothing to fix here anymore

    // Return the fixed characters
    const characters = await q<{ id: string; name: string; class: string; level: number; gold: number }>`
      SELECT id, name, class, level, gold
      FROM "Character"
      WHERE userid = ${session.userId}
      ORDER BY name ASC
    `;

    return NextResponse.json({ 
  ok: true, 
  message: `Checked ${characters.length} character(s)`,
      characters 
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
