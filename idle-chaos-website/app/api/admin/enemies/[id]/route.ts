import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { q } from "@/src/lib/db";

type IdCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: IdCtx) {
	try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
	const rows = await q<{ id: string; name: string; level: number; basehp: number; expbase: number; goldmin: number; goldmax: number; tags: string | null }>`
		select id, name, level, basehp, expbase, goldmin, goldmax, tags from "EnemyTemplate" where id = ${(await params).id}
	`;
	const r = rows[0];
	if (!r) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
	const row = { id: r.id, name: r.name, level: r.level, baseHp: r.basehp, expBase: r.expbase, goldMin: r.goldmin, goldMax: r.goldmax, tags: r.tags ?? '' };
	return NextResponse.json({ ok: true, row });
}

export async function PATCH(req: Request, { params }: IdCtx) {
	try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
	const body = await req.json().catch(() => ({}));
	const { name, level, baseHp, expBase, goldMin, goldMax, tags } = body as Record<string, unknown>;
	const rows = await q<{ id: string; name: string; level: number; basehp: number; expbase: number; goldmin: number; goldmax: number; tags: string | null }>`
		update "EnemyTemplate" set
			name = coalesce(${typeof name === 'string' ? name : null}::text, name),
			level = coalesce(${typeof level === 'number' ? level : null}::int, level),
			basehp = coalesce(${typeof baseHp === 'number' ? baseHp : null}::int, basehp),
			expbase = coalesce(${typeof expBase === 'number' ? expBase : null}::int, expbase),
			goldmin = coalesce(${typeof goldMin === 'number' ? goldMin : null}::int, goldmin),
			goldmax = coalesce(${typeof goldMax === 'number' ? goldMax : null}::int, goldmax),
			tags = coalesce(${typeof tags === 'string' ? tags : null}::text, tags)
		where id = ${(await params).id}
		returning id, name, level, basehp, expbase, goldmin, goldmax, tags
	`;
	const r = rows[0];
	if (!r) return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
	const row = { id: r.id, name: r.name, level: r.level, baseHp: r.basehp, expBase: r.expbase, goldMin: r.goldmin, goldMax: r.goldmax, tags: r.tags ?? '' };
	return NextResponse.json({ ok: true, row });
}

export async function DELETE(_req: Request, { params }: IdCtx) {
	try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
	const { id } = await params;
	await q`delete from "EnemyTemplate" where id = ${id}`;
	return NextResponse.json({ ok: true });
}

