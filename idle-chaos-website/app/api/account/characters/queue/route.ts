import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth";

type FurnaceQueue = { recipe: "copper" | "bronze"; eta: number; startedAt: number; remaining: number; per: number; total: number };
type WorkbenchQueue = { recipe: "armor" | "dagger"; eta: number; startedAt: number; remaining: number; per: number; total: number };

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("characterId") || undefined;
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const client = prisma as unknown as {
    character: { findFirst: (args: { where: { id: string; userId: string } }) => Promise<unknown> };
    craftQueue: {
      findUnique: (args: { where: { characterId: string } }) => Promise<{ furnace: FurnaceQueue | null; workbench: WorkbenchQueue | null } | null>;
      upsert: (args: { where: { characterId: string }; update: { furnace?: FurnaceQueue | null; workbench?: WorkbenchQueue | null }; create: { characterId: string; furnace?: FurnaceQueue | null; workbench?: WorkbenchQueue | null } }) => Promise<unknown>;
    };
  };
  const owner = await client.character.findFirst({ where: { id: characterId, userId: session.userId } });
  if (!owner) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const row = await client.craftQueue.findUnique({ where: { characterId } });
  return NextResponse.json({ ok: true, furnace: row?.furnace ?? null, workbench: row?.workbench ?? null });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { characterId, furnace, workbench } = body as { characterId?: string; furnace?: FurnaceQueue | null; workbench?: WorkbenchQueue | null };
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const client = prisma as unknown as {
    character: { findFirst: (args: { where: { id: string; userId: string } }) => Promise<unknown> };
    craftQueue: {
      upsert: (args: { where: { characterId: string }; update: { furnace?: FurnaceQueue | null; workbench?: WorkbenchQueue | null }; create: { characterId: string; furnace?: FurnaceQueue | null; workbench?: WorkbenchQueue | null } }) => Promise<unknown>;
    };
  };
  const owner = await client.character.findFirst({ where: { id: characterId, userId: session.userId } });
  if (!owner) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  await client.craftQueue.upsert({
    where: { characterId },
    update: { furnace: furnace ?? undefined, workbench: workbench ?? undefined },
    create: { characterId, furnace: furnace ?? undefined, workbench: workbench ?? undefined },
  });
  return NextResponse.json({ ok: true });
}
