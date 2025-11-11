import { NextResponse } from 'next/server';
import { getSession } from '@/src/lib/auth';
import { q, ensureUserSettingsColumn } from '@/src/lib/db';

// Shape of sanitizable settings (extend cautiously)
const ALLOWED_SETTINGS: Record<string, 'number' | 'boolean'> = {
  musicVolume: 'number',
  sfxVolume: 'number',
  alwaysRun: 'boolean',
  showAtkRange: 'boolean',
  autoUseHP: 'boolean',
  autoUseHPThreshold: 'number',
  autoUseMana: 'boolean',
  autoUseManaThreshold: 'number'
};

function sanitizeIncoming(partial: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(partial || {})) {
    const t = ALLOWED_SETTINGS[k];
    if (!t) continue;
    if (t === 'boolean') {
      out[k] = Boolean(v);
    } else if (t === 'number') {
      let num = Number(v);
      if (!Number.isFinite(num)) continue;
      // Clamp specific known ranges
      if (k === 'musicVolume' || k === 'sfxVolume') num = Math.min(1, Math.max(0, num));
      if (k === 'autoUseHPThreshold') num = Math.min(99, Math.max(1, Math.floor(num)));
      if (k === 'autoUseManaThreshold') num = Math.min(99, Math.max(1, Math.floor(num)));
      out[k] = num;
    }
  }
  return out;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  await ensureUserSettingsColumn();
  try {
    const rows = await q<{ settings: Record<string, unknown> | null }>`select settings from "User" where id = ${session.userId} limit 1`;
    const settings = rows[0]?.settings || {};
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  await ensureUserSettingsColumn();
  let body: { settings?: Record<string, unknown> } = {};
  try { body = await req.json(); } catch {}
  const incoming = sanitizeIncoming(body.settings || {});
  try {
    // Fetch existing to merge
    const rows = await q<{ settings: Record<string, unknown> | null }>`select settings from "User" where id = ${session.userId} limit 1`;
    const current = rows[0]?.settings || {};
    const merged = { ...current, ...incoming };
    await q`update "User" set settings = ${JSON.stringify(merged)}::jsonb where id = ${session.userId}`;
    return NextResponse.json({ ok: true, settings: merged });
  } catch {
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }
}

// Allow PUT as full replacement (sanitized) if desired
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  await ensureUserSettingsColumn();
  let body: { settings?: Record<string, unknown> } = {};
  try { body = await req.json(); } catch {}
  const sanitized = sanitizeIncoming(body.settings || {});
  try {
    await q`update "User" set settings = ${JSON.stringify(sanitized)}::jsonb where id = ${session.userId}`;
    return NextResponse.json({ ok: true, settings: sanitized });
  } catch {
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }
}
