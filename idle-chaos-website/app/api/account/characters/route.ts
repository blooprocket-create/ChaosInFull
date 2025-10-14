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
  type StatUpdateData = {
    strength?: { increment: number };
    intellect?: { increment: number };
    agility?: { increment: number };
    luck?: { increment: number };
  };
  const client = prisma as unknown as {
    character: {
      findFirst: (args: { where: { userId: string; name: string } }) => Promise<unknown | null>;
      create: (args: { data: { userId: string; name: string; class: string; gender: string; hat: string } }) => Promise<unknown>;
    };
    playerStat: { update: (args: { where: { userId: string }, data: StatUpdateData }) => Promise<unknown> };
  };
  // Early duplicate check for a clearer error
  try {
    const dupe = await client.character.findFirst({ where: { userId: session.userId, name } });
    if (dupe) return NextResponse.json({ error: "You already have a character with that name." }, { status: 409 });
  } catch (e) {
    // If findFirst fails due to client issues, continue to attempt create; we'll catch and log below
  }
  try {
    const created = await client.character.create({ data: { userId: session.userId, name, class: klass, gender, hat } });
    // Apply starting bonus to account stats (+3 to selected stat)
    const data: StatUpdateData = {};
    if (hat === "STR") data.strength = { increment: 3 };
    if (hat === "INT") data.intellect = { increment: 3 };
    if (hat === "AGI") data.agility = { increment: 3 };
    if (hat === "LUK") data.luck = { increment: 3 };
    try { await client.playerStat.update({ where: { userId: session.userId }, data }); } catch {}
    return NextResponse.json({ ok: true, character: created });
  } catch (err) {
    // Surface helpful error details in dev while keeping client message friendly
    console.error("[characters:POST] create failed", err);
    const msg = err instanceof Error ? err.message : "Could not create character";
    // Try to detect unique constraint error (P2002) or similar
    if (msg.toLowerCase().includes("unique") || msg.includes("P2002")) {
      return NextResponse.json({ error: "Name is already taken for your account." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create character. Please try again." }, { status: 500 });
  }
}
