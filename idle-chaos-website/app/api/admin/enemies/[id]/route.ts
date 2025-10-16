import { NextResponse } from "next/server";
import { assertAdmin } from "@/src/lib/authz";
import { prisma } from "@/src/lib/prisma";

type IdCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: IdCtx) {
	try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
	const { id } = await params;
	const row = await prisma.enemyTemplate.findUnique({ where: { id } });
	if (!row) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
	return NextResponse.json({ ok: true, row });
}

export async function PATCH(req: Request, { params }: IdCtx) {
	try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
	type Body = Partial<{ name: string; tags: string; level: number; baseHp: number; expBase: number; goldMin: number; goldMax: number }>;
	const bodyUnknown: unknown = await req.json().catch(() => ({}));
	const body: Body = (typeof bodyUnknown === 'object' && bodyUnknown !== null) ? (bodyUnknown as Body) : {};
	const data: Partial<{ name: string; tags: string; level: number; baseHp: number; expBase: number; goldMin: number; goldMax: number }> = {};
	if (typeof body.name === "string") data.name = body.name;
	if (typeof body.tags === "string") data.tags = body.tags;
	if (typeof body.level === "number") data.level = body.level;
	if (typeof body.baseHp === "number") data.baseHp = body.baseHp;
	if (typeof body.expBase === "number") data.expBase = body.expBase;
	if (typeof body.goldMin === "number") data.goldMin = body.goldMin;
	if (typeof body.goldMax === "number") data.goldMax = body.goldMax;
	try {
		const { id } = await params;
		const row = await prisma.enemyTemplate.update({ where: { id }, data });
		return NextResponse.json({ ok: true, row });
	} catch {
		return NextResponse.json({ ok: false, error: "update_failed" }, { status: 400 });
	}
}

export async function DELETE(_req: Request, { params }: IdCtx) {
	try { await assertAdmin(); } catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
	try {
		const { id } = await params;
		await prisma.enemyTemplate.delete({ where: { id } });
		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 400 });
	}
}

