import { NextRequest, NextResponse } from 'next/server';
import { getFishingEventLeaderboard, getFishingEventFishTotals, incrementFishingEventCatch, ensureFishingEventTable } from '@/src/lib/db';
import { getSession } from '@/src/lib/auth';

// Active event window config
// For simplicity, hard-code one-month Intro to Fishing.
const INTRO_EVENT = {
  key: 'intro_to_fishing',
  name: 'Intro to Fishing',
  // Start now if unspecified via env; otherwise read from env
  start: process.env.INTRO_FISHING_START || new Date().toISOString(),
  // End +30 days
  end: process.env.INTRO_FISHING_END || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  description: 'Catch fish to climb the leaderboard. Every catch adds to your total and the global haul.'
};

function isWithinWindow(startIso: string, endIso: string) {
  const now = Date.now();
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  return Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  if (!eventKey) return NextResponse.json({ error: 'missing eventKey' }, { status: 400 });
  await ensureFishingEventTable();
  // Provide leaderboard + totals
  const [leaders, fishTotals] = await Promise.all([
    getFishingEventLeaderboard(eventKey, 25),
    getFishingEventFishTotals(eventKey)
  ]);
  // Also expose event metadata (currently only supports the intro event key)
  const meta = eventKey === INTRO_EVENT.key ? INTRO_EVENT : { key: eventKey };
  return NextResponse.json({ meta, leaders, fishTotals });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  if (!eventKey) return NextResponse.json({ error: 'missing eventKey' }, { status: 400 });

  // Enforce active window when using the built-in intro event
  if (eventKey === INTRO_EVENT.key) {
    if (!isWithinWindow(INTRO_EVENT.start, INTRO_EVENT.end)) {
      return NextResponse.json({ error: 'event not active' }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const { fishId, fishName } = body || {};
  if (!fishId) return NextResponse.json({ error: 'missing fishId' }, { status: 400 });

  // Identify user (best effort)
  let userId: string | null = null;
  let username: string | null = null;
  try {
    const session = await getSession();
    if (session) {
      userId = session.userId;
      username = null; // username lookup optional; keep null to avoid leaking email
    }
  } catch {}

  await incrementFishingEventCatch({ eventKey, userId, username, fishId, fishName });
  return NextResponse.json({ ok: true });
}
