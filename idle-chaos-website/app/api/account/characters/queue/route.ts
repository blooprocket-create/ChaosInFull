import { NextResponse } from "next/server";

// This endpoint belonged to a retired crafting system (old game).
// Keep the route but make it a hard 410 Gone to avoid confusion and DB side-effects.

export async function GET() {
  return NextResponse.json({ ok: false, error: "gone", message: "Crafting is not part of the current game." }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: "gone", message: "Crafting is not part of the current game." }, { status: 410 });
}
