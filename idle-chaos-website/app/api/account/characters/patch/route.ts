import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { q, ensureCharacterTable, ensureCharacterExtraColumns } from "@/src/lib/db";

// Patch update for character fields migrated from localStorage
// Accepts partial subset and updates only provided columns.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const {
    characterId,
    gold,
    flags,
    fishing,
    equipment,
    talents,
    lastScene,
    lastX,
    lastY,
  } = body as {
    characterId?: string;
    gold?: number;
    flags?: unknown;
    fishing?: unknown;
    equipment?: unknown;
    talents?: unknown;
    lastScene?: string;
    lastX?: number;
    lastY?: number;
  };

  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  await ensureCharacterTable();
  await ensureCharacterExtraColumns();

  // Ownership check
  const owned = await q<{ id: string }>`select id from "Character" where id = ${characterId} and userid = ${session.userId} limit 1`;
  if (!owned.length) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const updates: string[] = [];
  const params: unknown[] = [];

  function add(col: string, val: unknown) {
    updates.push(`${col} = $${params.length + 1}`);
    params.push(val);
  }

  if (typeof gold === "number" && isFinite(gold)) add("gold", Math.max(0, Math.floor(gold)));
  if (typeof lastScene === "string" && lastScene.length <= 100) add("lastscene", lastScene);
  if (typeof lastX === "number" && isFinite(lastX)) add("lastx", lastX);
  if (typeof lastY === "number" && isFinite(lastY)) add("lasty", lastY);
  if (flags !== undefined) add("flags", flags as object);
  if (fishing !== undefined) add("fishing", fishing as object);
  if (equipment !== undefined) add("equipment", equipment as object);
  if (talents !== undefined) add("talents", talents as object);

  if (updates.length === 0) return NextResponse.json({ ok: true, updated: 0 });

  const sqlText = `update "Character" set ${updates.join(", ")}, lastseenat = now() where id = $${params.length + 1} and userid = $${params.length + 2}`;
  try {
    await q`select 1`; // warm connection
    // Neon doesn't expose parametrized text execution directly via q, so we inline a small dynamic query
    // Build a template string array and feed params
    const tmpl = [sqlText] as unknown as TemplateStringsArray;
  // Cast q to a variadic template executor with unknown for safer typing than any
  const exec = q as (s: TemplateStringsArray, ...p: unknown[]) => Promise<unknown>;
  await exec(tmpl, ...params, characterId, session.userId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: "db_error", message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
