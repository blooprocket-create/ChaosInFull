import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth";

type FurnaceQueue = { recipe: "copper" | "bronze"; eta: number; startedAt: number; remaining: number; per: number; total: number };
type WorkbenchQueue = { recipe: "armor" | "dagger"; eta: number; startedAt: number; remaining: number; per: number; total: number };
type SawmillQueue = { recipe: "plank" | "oak_plank"; eta: number; startedAt: number; remaining: number; per: number; total: number };

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("characterId") || undefined;
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const client = prisma as unknown as {
    character: { findFirst: (args: { where: { id: string; userId: string } }) => Promise<unknown> };
    craftQueue: {
      findUnique: (args: { where: { characterId: string } }) => Promise<{ furnace: FurnaceQueue | null; workbench: WorkbenchQueue | null; sawmill: SawmillQueue | null } | null>;
      upsert: (args: { where: { characterId: string }; update: { furnace?: FurnaceQueue | null; workbench?: WorkbenchQueue | null; sawmill?: SawmillQueue | null }; create: { characterId: string; furnace?: FurnaceQueue | null; workbench?: WorkbenchQueue | null; sawmill?: SawmillQueue | null } }) => Promise<unknown>;
    };
  };
  const owner = await client.character.findFirst({ where: { id: characterId, userId: session.userId } });
  if (!owner) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const row = await client.craftQueue.findUnique({ where: { characterId } });
  return NextResponse.json({ ok: true, furnace: row?.furnace ?? null, workbench: row?.workbench ?? null, sawmill: row?.sawmill ?? null });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { characterId, furnace, workbench, sawmill } = body as { characterId?: string; furnace?: FurnaceQueue | null; workbench?: WorkbenchQueue | null; sawmill?: SawmillQueue | null };
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const client = prisma as unknown as {
    character: { findFirst: (args: { where: { id: string; userId: string } }) => Promise<unknown> };
    craftQueue: {
      upsert: (args: { where: { characterId: string }; update: { furnace?: FurnaceQueue | null; workbench?: WorkbenchQueue | null; sawmill?: SawmillQueue | null }; create: { characterId: string; furnace?: FurnaceQueue | null; workbench?: WorkbenchQueue | null; sawmill?: SawmillQueue | null } }) => Promise<unknown>;
    };
  };
  const owner = await client.character.findFirst({ where: { id: characterId, userId: session.userId } });
  if (!owner) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  await client.craftQueue.upsert({
    where: { characterId },
    update: { furnace: furnace ?? undefined, workbench: workbench ?? undefined, sawmill: sawmill ?? undefined },
    create: { characterId, furnace: furnace ?? undefined, workbench: workbench ?? undefined, sawmill: sawmill ?? undefined },
  });
  return NextResponse.json({ ok: true });
}
