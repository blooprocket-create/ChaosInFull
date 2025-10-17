import { NextResponse } from "next/server";
import { q } from "@/src/lib/db";
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
  const owner = await q<{ id: string }>`select id from "Character" where id = ${characterId} and userid = ${session.userId}`;
  if (!owner) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const row = await q<{ furnace: unknown | null; workbench: unknown | null; sawmill: unknown | null }>`
    select furnace, workbench, sawmill from "CraftQueue" where characterid = ${characterId}
  `;
  const r = row[0];
  return NextResponse.json({ ok: true, furnace: (r?.furnace as FurnaceQueue | null) ?? null, workbench: (r?.workbench as WorkbenchQueue | null) ?? null, sawmill: (r?.sawmill as SawmillQueue | null) ?? null });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object") return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const body = raw as Record<string, unknown>;
  const characterId = typeof body.characterId === "string" ? body.characterId : undefined;
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const furnace = (body.furnace ?? undefined) as FurnaceQueue | null | undefined;
  const workbench = (body.workbench ?? undefined) as WorkbenchQueue | null | undefined;
  const sawmill = (body.sawmill ?? undefined) as SawmillQueue | null | undefined;
  const hasFurnace = Object.prototype.hasOwnProperty.call(body, "furnace");
  const hasWorkbench = Object.prototype.hasOwnProperty.call(body, "workbench");
  const hasSawmill = Object.prototype.hasOwnProperty.call(body, "sawmill");
  const owner = await q<{ id: string }>`select id from "Character" where id = ${characterId} and userid = ${session.userId}`;
  if (!owner) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const updateData: { furnace?: FurnaceQueue | null; workbench?: WorkbenchQueue | null; sawmill?: SawmillQueue | null } = {};
  if (hasFurnace) updateData.furnace = furnace ?? null;
  if (hasWorkbench) updateData.workbench = workbench ?? null;
  if (hasSawmill) updateData.sawmill = sawmill ?? null;
  const createData: { characterId: string; furnace: FurnaceQueue | null; workbench: WorkbenchQueue | null; sawmill: SawmillQueue | null } = {
    characterId,
    furnace: hasFurnace ? (furnace ?? null) : null,
    workbench: hasWorkbench ? (workbench ?? null) : null,
    sawmill: hasSawmill ? (sawmill ?? null) : null,
  };
  await q`
    insert into "CraftQueue" (characterid, furnace, workbench, sawmill)
    values (${characterId}, ${hasFurnace ? (furnace ?? null) : null}::jsonb, ${hasWorkbench ? (workbench ?? null) : null}::jsonb, ${hasSawmill ? (sawmill ?? null) : null}::jsonb)
    on conflict (characterid) do update set
      furnace = coalesce(excluded.furnace, "CraftQueue".furnace),
      workbench = coalesce(excluded.workbench, "CraftQueue".workbench),
      sawmill = coalesce(excluded.sawmill, "CraftQueue".sawmill)
  `;
  return NextResponse.json({ ok: true });
}
