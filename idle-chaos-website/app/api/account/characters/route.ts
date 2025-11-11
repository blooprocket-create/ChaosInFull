import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensurePgcrypto, ensureCharacterTable, ensureCharacterExtraColumns, ensureCharacterStatColumns, ensureCharacterDefenseColumn, ensureItemStackTable, ensureCharacterQuestTable } from "@/src/lib/db";
import { computeInitialCharacterData } from "@/src/lib/characterInit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureCharacterTable();
    type Row = { id: string; name: string; class: string; level: number; str?: number; int?: number; agi?: number; luk?: number };
    const rows = await q<Row>`
      select id, name, class, level,
        /* Include stat columns if they exist; ignored if not present */
        (select column_name from information_schema.columns where table_name='Character' and column_name='str' limit 1) is not null as dummy,
        str, int, agi, luk
      from "Character"
      where userid = ${session.userId}
      order by name asc
    `;
    // Map rows to include stats only if defined numbers
    const characters = rows.map(r => ({
      id: r.id,
      name: r.name,
      class: r.class,
      level: r.level,
      ...(typeof r.str === 'number' && typeof r.int === 'number' && typeof r.agi === 'number' && typeof r.luk === 'number'
        ? { stats: { str: r.str, int: r.int, agi: r.agi, luk: r.luk } }
        : {})
    }));
    return NextResponse.json({ ok: true, characters });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to load characters" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensurePgcrypto();
  await ensureCharacterTable();
  await ensureCharacterExtraColumns();
  await ensureCharacterStatColumns();
  await ensureCharacterDefenseColumn();
  await ensureItemStackTable();
  await ensureCharacterQuestTable();
    const owners = await q<{ id: string }>`select id from "User" where id = ${session.userId} limit 1`;
    if (!owners[0]) {
      return NextResponse.json({ error: "Account not found. Please log out and log back in." }, { status: 409 });
    }
    const form = await req.formData();
  const name = String(form.get("name") || "").trim();
    // Optional Phaser scene fields (race, weapon)
  const race = String(form.get("race") || "");
  const weapon = String(form.get("weapon") || "");
    const klass = "Beginner"; // Always start as Beginner
    if (name.length < 3 || name.length > 20) return NextResponse.json({ error: "Name must be 3-20 chars" }, { status: 400 });

  // Create character with default values
  // Use 'data' JSONB column for flexible storage of any character fields
  type Created = { id: string; name: string; class: string; level: number };
    const initialData = computeInitialCharacterData({ race, weapon });
    
    // Detect presence of legacy columns and insert accordingly to avoid "column does not exist" or NOT NULL violations
    const presentCols = await q<{ column_name: string }>`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'Character' and column_name = any(${['race','str','int','agi','luk','defense']})
    `;
    const hasRace = presentCols.some(c => c.column_name === 'race');
    const hasStats = ['str','int','agi','luk'].every(col => presentCols.some(c => c.column_name === col));
    const hasDefense = presentCols.some(c => c.column_name === 'defense');

    let created: Created;
    const stats = (initialData as any).stats || { str:1,int:1,agi:1,luk:1 };
    // Remove stats from JSONB to avoid duplication now that columns exist.
    delete (initialData as any).stats;

    if (hasRace && hasStats && hasDefense) {
      const createdRows = await q<Created>`
        insert into "Character" (
          id, userid, name, class, race, str, int, agi, luk, defense, data
        ) values (
          gen_random_uuid()::text, ${session.userId}, ${name}, ${klass}, ${race}, ${stats.str}, ${stats.int}, ${stats.agi}, ${stats.luk}, 0,
          ${JSON.stringify(initialData)}::jsonb
        )
        returning id, name, class, level
      `;
      created = createdRows[0];
    } else if (hasStats && hasDefense && !hasRace) {
      const createdRows = await q<Created>`
        insert into "Character" (
          id, userid, name, class, str, int, agi, luk, defense, data
        ) values (
          gen_random_uuid()::text, ${session.userId}, ${name}, ${klass}, ${stats.str}, ${stats.int}, ${stats.agi}, ${stats.luk}, 0,
          ${JSON.stringify(initialData)}::jsonb
        )
        returning id, name, class, level
      `;
      created = createdRows[0];
    } else if (hasRace && !hasStats) {
      const createdRows = await q<Created>`
        insert into "Character" (
          id, userid, name, class, race, data
        ) values (
          gen_random_uuid()::text, ${session.userId}, ${name}, ${klass}, ${race},
          ${JSON.stringify(initialData)}::jsonb
        )
        returning id, name, class, level
      `;
      created = createdRows[0];
    } else {
      const createdRows = await q<Created>`
        insert into "Character" (
          id, userid, name, class, data
        ) values (
          gen_random_uuid()::text, ${session.userId}, ${name}, ${klass},
          ${JSON.stringify(initialData)}::jsonb
        )
        returning id, name, class, level
      `;
      created = createdRows[0];
    }

    // If a starter weapon was chosen, ensure it's in the character's inventory as well.
    if (weapon) {
      await q`
        insert into "ItemStack" (characterid, itemkey, count)
        values (${(created as any).id}, ${weapon}, 1)
        on conflict (characterid, itemkey) do update set count = "ItemStack".count + 1
      `;
    }

    // No gender/hat usage anymore; no account stat bonus on create.

    return NextResponse.json({ ok: true, character: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Unique constraint or other errors
    return NextResponse.json({ error: message || "Could not create character (maybe name is taken?)" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { searchParams } = new URL(req.url);
    const characterId = searchParams.get("id");
    
    if (!characterId) return NextResponse.json({ error: "Character ID required" }, { status: 400 });
    
    await ensureCharacterTable();
    
    // Verify ownership before deleting
    const owned = await q<{ id: string }>`
      select id from "Character" 
      where id = ${characterId} and userid = ${session.userId}
      limit 1
    `;
    
    if (!owned.length) {
      return NextResponse.json({ error: "Character not found or you don't own it" }, { status: 404 });
    }
    
    // Delete the character (cascade will delete related records)
    await q`delete from "Character" where id = ${characterId} and userid = ${session.userId}`;
    
    return NextResponse.json({ ok: true, message: "Character deleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to delete character" }, { status: 500 });
  }
}
