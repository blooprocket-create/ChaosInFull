import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { getZoneRoom } from "@/src/server/rooms/zoneRoom";
import { sql } from "@/src/lib/db";
import { assertCharacterOwner } from "@/src/lib/ownership";

function getAbsoluteBase(req: Request) {
  // Prefer NEXT_PUBLIC_BASE_URL if absolute, else origin header, else http://localhost fallback
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env && /^https?:\/\//i.test(env)) return env.replace(/\/$/, "");
  const origin = req.headers.get("origin") || req.headers.get("x-forwarded-origin") || "";
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/$/, "");
  // Respect TLS terminators / proxies
  const xfProto = req.headers.get("x-forwarded-proto");
  const xfHost = req.headers.get("x-forwarded-host");
  if (xfHost) {
    const proto = xfProto && /https/i.test(xfProto) ? "https" : "http";
    return `${proto}://${xfHost}`;
  }
  const host = req.headers.get("host");
  if (host) {
    // If Host has :443 or the request is on https scheme, prefer https
    const guessHttps = /:443$/.test(host) || /https/i.test(xfProto || "");
    return `${guessHttps ? "https" : "http"}://${host}`;
  }
  return "http://localhost:3000";
}

async function awardExp(characterId: string, exp: number, cookie: string | null, req: Request) {
  const base = getAbsoluteBase(req);
  await fetch(`${base}/api/account/characters/exp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ characterId, exp })
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  type CmdBody = { zone?: string; characterId?: string; action?: string; value?: unknown };
  const body: CmdBody = await req.json().catch(() => ({} as CmdBody));
  const { zone, characterId, action, value } = body;
  if (!zone || !characterId || !action) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  // Ownership check: ensure character belongs to current user
  try { await assertCharacterOwner(session.userId, characterId); }
  catch { return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }); }
  const room = getZoneRoom(zone);
  if (action === "auto") {
    const on = !!value;
    room.toggleAuto(characterId, on);
    // Persist AFK state
    try {
      const now = new Date();
      const zoneId = zone;
      // Upsert per-character AFK row
      await sql`
        insert into "AfkCombatState" (id, characterid, zone, auto, startedat, lastsnapshot)
        values (concat('afk_', substr(md5(random()::text), 1, 8)), ${characterId}, ${zoneId}, ${on}, ${now.toISOString()}, ${now.toISOString()})
        on conflict (characterid) do update set auto = excluded.auto, zone = excluded.zone,
          startedat = ${on ? now.toISOString() : null}, lastsnapshot = ${!on ? now.toISOString() : null}
      `;
    } catch {}
    return NextResponse.json({ ok: true });
  }
  if (action === "basic") {
    let hintX: number | undefined = undefined;
    if (value && typeof value === "object" && (value as { x?: unknown }).x !== undefined) {
      const vx = (value as { x?: unknown }).x;
      if (typeof vx === "number") hintX = vx;
    }
    const res = room.basicAttack(characterId, hintX);
  if (res.killed && res.mobId) {
      type Harvested = { templateId: string; rewards: Array<{ characterId: string; exp: number }>; loot: Array<{ itemId: string; qty: number }> };
      const harvested = room.harvestRewardsIfDead(res.mobId) as Harvested | null;
      const rw = harvested ? harvested.rewards : [];
      // MVP: award only EXP via internal endpoint
    const cookie = req.headers.get("cookie");
    // Only award EXP to the attacker for MVP personal phases.
    const selfReward = rw.find(r => r.characterId === characterId) || (rw.length ? rw[0] : undefined);
  let newExp: number | undefined;
  let newLevel: number | undefined;
  let goldDeltaApplied = 0;
    if (selfReward) {
      await awardExp(characterId, selfReward.exp, cookie, req);
      // After awarding EXP, fetch the updated exp/level from DB for immediate HUD update
      try {
        const rows = await (sql`
          select exp, level from "Character" where id = ${characterId} limit 1
        ` as unknown as Array<{ exp: number; level: number }>);
        if (rows[0]) { newExp = rows[0].exp; newLevel = rows[0].level; }
      } catch {}
    }
      // Minimal gold + loot for killer
      try {
        const killerId = characterId;
        const killerRows = await (sql`select id from "Character" where id = ${killerId} limit 1` as unknown as Array<{ id: string }>);
        const killer = killerRows[0];
        if (killer) {
          const baseExp = harvested?.rewards?.find(r=>r.characterId===killerId)?.exp ?? harvested?.rewards?.[0]?.exp ?? 5;
          const goldDelta = harvested?.loot?.length ? Math.min(Math.max(1, Math.floor(baseExp / 2)), 5) : (1 + Math.floor(Math.random() * 3));
          await sql`update "Character" set gold = gold + ${goldDelta} where id = ${killerId}`.catch(()=>{});
          goldDeltaApplied = goldDelta;
          // Persist each rolled drop
          if (Array.isArray(harvested?.loot)) {
            for (const it of harvested.loot as Array<{ itemId: string; qty: number }>) {
              const currRows = await (sql`
                select count from "ItemStack" where characterid = ${killerId} and itemkey = ${it.itemId} limit 1
              ` as unknown as Array<{ count: number }>);
              const count = (currRows?.[0]?.count ?? 0) + Math.max(1, it.qty);
              await sql`
                insert into "ItemStack" (id, characterid, itemkey, count)
                values (concat('is_', substr(md5(random()::text), 1, 8)), ${killerId}, ${it.itemId}, ${count})
                on conflict (characterid, itemkey) do update set count = ${count}
              `;
            }
          }
        }
      } catch {}
      // Quest progress hook: if killed a slime, progress tutorial quest by +1 for the killer
      try {
        if (harvested && harvested.templateId === "slime") {
          const cookie = req.headers.get("cookie");
          const base = getAbsoluteBase(req);
          await fetch(`${base}/api/quest`, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify({ action: "progress", characterId, progressDelta: 1 }) });
        }
      } catch {}
  return NextResponse.json({ ok: true, result: res, rewards: selfReward ? [selfReward] : [], loot: harvested?.loot ?? [], exp: newExp, level: newLevel, gold: goldDeltaApplied });
    }
    return NextResponse.json({ ok: true, result: res });
  }
  return NextResponse.json({ ok: false, error: "unsupported" }, { status: 400 });
}
