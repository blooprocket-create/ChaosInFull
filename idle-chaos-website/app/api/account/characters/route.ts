import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client = prisma as unknown as {
    character: {
      findMany: (args: { where: { userId: string }; orderBy: { createdAt: "asc" } }) => Promise<unknown[]>;
      create: (args: { data: { userId: string; name: string; class: string } }) => Promise<unknown>;
    };
  };
  const list = await client.character.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ ok: true, characters: list });
}

export async function POST(req: Request) {
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
  try {
    const client = prisma as unknown as {
      character: { create: (args: { data: { userId: string; name: string; class: string; gender: string; hat: string } }) => Promise<any> };
      playerStat: { update: (args: { where: { userId: string }, data: Partial<{ strength: number; intellect: number; agility: number; luck: number }> }) => Promise<any> };
    };
    const created = await client.character.create({ data: { userId: session.userId, name, class: klass, gender, hat } });
    // Apply starting bonus to account stats
    const bonuses: Record<string, Partial<{ strength: number; intellect: number; agility: number; luck: number }>> = {
      STR: { strength: { } as any },
      INT: { intellect: { } as any },
      AGI: { agility: { } as any },
      LUK: { luck: { } as any },
    };
    // Just add +3 to the chosen stat
    const data: any = {};
    if (hat === "STR") data.strength = { increment: 3 };
    if (hat === "INT") data.intellect = { increment: 3 };
    if (hat === "AGI") data.agility = { increment: 3 };
    if (hat === "LUK") data.luck = { increment: 3 };
    try { await client.playerStat.update({ where: { userId: session.userId }, data }); } catch {}
    return NextResponse.json({ ok: true, character: created });
  } catch {
    return NextResponse.json({ error: "Could not create character (maybe name is taken?)" }, { status: 400 });
  }
}
