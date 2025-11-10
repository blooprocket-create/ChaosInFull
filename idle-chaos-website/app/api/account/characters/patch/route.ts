import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensureCharacterTable, ensureCharacterExtraColumns } from "@/src/lib/db";

// Flexible patch update for character fields
// Accepts ANY fields from the client and merges them into the JSONB 'data' column
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  
  const body = await req.json().catch(() => ({}));
  const { characterId, ...patchData } = body as { characterId?: string; [key: string]: unknown };

  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  await ensureCharacterTable();
  await ensureCharacterExtraColumns();

  // Ownership check
  const owned = await q<{ id: string; data: Record<string, unknown> }>`
    select id, data from "Character" 
    where id = ${characterId} and userid = ${session.userId} 
    limit 1
  `;
  if (!owned.length) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  // Get current data
  const currentData = owned[0].data || {};
  
  // Merge patch data into current data (shallow merge)
  const mergedData = { ...currentData, ...patchData };
  
  try {
    // Simple update - just set the data JSONB column and update timestamp
    await q`
      update "Character" 
      set data = ${JSON.stringify(mergedData)}::jsonb, lastseenat = now()
      where id = ${characterId} and userid = ${session.userId}
    `;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Character patch error:', message);
    return NextResponse.json({ ok: false, error: "db_error", message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
