import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q } from "@/src/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    type Row = { id: string; name: string; class: string; level: number };
    const rows = await q<Row>`
      select id, name, class, level
      from "Character"
      where userid = ${session.userId}
      order by name asc
    `;
    return NextResponse.json({ ok: true, characters: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || "Failed to load characters" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const form = await req.formData();
    const name = String(form.get("name") || "").trim();
    const gender = String(form.get("gender") || "Male");
    const hat = String(form.get("hat") || "STR");
    const klass = "Beginner"; // Always start as Beginner
    if (name.length < 3 || name.length > 20) return NextResponse.json({ error: "Name must be 3-20 chars" }, { status: 400 });
    if (!["Male","Female","Nonbinary"].includes(gender)) return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
    if (!["STR","INT","AGI","LUK"].includes(hat)) return NextResponse.json({ error: "Invalid hat" }, { status: 400 });

    // Create character
    type Created = { id: string; name: string; class: string; level: number };
    const createdRows = await q<Created>`
      insert into "Character" (id, userid, name, class, gender, hat)
      values (gen_random_uuid()::text, ${session.userId}, ${name}, ${klass}, ${gender}, ${hat})
      returning id, name, class, level
    `;
    const created = createdRows[0];

    // Apply starting bonus to account stats (+3 to selected stat); ignore errors
    await q`
      update "PlayerStat"
      set
        strength = strength + case when ${hat} = 'STR' then 3 else 0 end,
        intellect = intellect + case when ${hat} = 'INT' then 3 else 0 end,
        agility  = agility  + case when ${hat} = 'AGI' then 3 else 0 end,
        luck     = luck     + case when ${hat} = 'LUK' then 3 else 0 end
      where userid = ${session.userId}
    `.catch(() => {});

    return NextResponse.json({ ok: true, character: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Unique constraint or other errors
    return NextResponse.json({ error: message || "Could not create character (maybe name is taken?)" }, { status: 400 });
  }
}
