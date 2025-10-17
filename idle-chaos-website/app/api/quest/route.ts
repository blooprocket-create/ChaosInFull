import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSession } from "@/src/lib/auth";
import { q } from "@/src/lib/db";

// Tutorial quest constants
const TUTORIAL_QUEST_ID = "tutorial_kill_slimes_5";
const CRAFT_DAGGER_QUEST_ID = "tutorial_craft_copper_dagger";

type QuestRow = { id: string; name: string; description: string; objectivetarget: string; objectivetype: string; objectivecount: number; nextquestid: string | null; rewardgold: number; rewardexp: number; rewardminingexp: number; rewardcraftingexp: number; minlevel: number; requiresquestid: string | null };
type CharacterQuestRow = { characterid: string; questid: string; status: "AVAILABLE" | "ACTIVE" | "COMPLETED"; progress: number; claimedrewards: boolean };

async function ensureTutorialQuest() {
  // Upsert Grimsley NPC
  await q`insert into "NpcDef" (id, name) values ('grimsley', 'Grimsley') on conflict (id) do update set name = excluded.name`;
  // Ensure core items exist
  await q`insert into "ItemDef" (id, name, sell, stackable, maxstack) values ('copper_bar','Copper Bar', 8, true, 999) on conflict (id) do nothing`;
  await q`insert into "ItemDef" (id, name, sell, stackable, maxstack) values ('normal_planks','Plank', 4, true, 999) on conflict (id) do nothing`;
  // Upsert quest
  await q`insert into "Quest" (id, name, description, objectivetype, objectivetarget, objectivecount, givernpcid, nextquestid, rewardgold, rewardexp, minlevel)
           values (${TUTORIAL_QUEST_ID}, 'Can you punch?', 'Kill 5 slimes in the field.', 'KILL', 'slime', 5, 'grimsley', ${CRAFT_DAGGER_QUEST_ID}, 500, 250, 1)
           on conflict (id) do update set name = excluded.name, description = excluded.description, givernpcid = excluded.givernpcid, nextquestid = excluded.nextquestid, rewardgold = excluded.rewardgold, rewardexp = excluded.rewardexp, minlevel = excluded.minlevel`;
  // Reward items
  await q`insert into "QuestRewardItem" (id, questid, itemid, qty)
           values (${TUTORIAL_QUEST_ID + "__copper_bar"}, ${TUTORIAL_QUEST_ID}, 'copper_bar', 1)
           on conflict (id) do nothing`;
  await q`insert into "QuestRewardItem" (id, questid, itemid, qty)
           values (${TUTORIAL_QUEST_ID + "__normal_planks"}, ${TUTORIAL_QUEST_ID}, 'normal_planks', 1)
           on conflict (id) do update set itemid = excluded.itemid, qty = excluded.qty`;
}

async function ensureCraftDaggerQuest() {
  await q`insert into "ItemDef" (id, name, sell) values ('copper_dagger','Copper Dagger', 16) on conflict (id) do nothing`;
  await q`insert into "Quest" (id, name, description, objectivetype, objectivetarget, objectivecount, rewardcraftingexp, rewardexp, requiresquestid, minlevel)
           values (${CRAFT_DAGGER_QUEST_ID}, 'Can you craft?', 'Craft one copper dagger at the workbench.', 'CRAFT', 'copper_dagger', 1, 150, 150, ${TUTORIAL_QUEST_ID}, 1)
           on conflict (id) do update set name = excluded.name, description = excluded.description, rewardcraftingexp = excluded.rewardcraftingexp, rewardexp = excluded.rewardexp, requiresquestid = excluded.requiresquestid, minlevel = excluded.minlevel`;
}

export async function GET(req: Request) {
  const session = await getSession(); if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("characterId") || "";
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  await ensureTutorialQuest();
  await ensureCraftDaggerQuest();
  const cq = await q<CharacterQuestRow & QuestRow>`
    select cq.characterid, cq.questid, cq.status, cq.progress, cq.claimedrewards,
           q.id, q.name, q.description, q.objectivetype, q.objectivetarget, q.objectivecount,
           q.nextquestid, q.rewardgold, q.rewardexp, q.rewardminingexp, q.rewardcraftingexp, q.minlevel, q.requiresquestid
    from "CharacterQuest" cq join "Quest" q on q.id = cq.questid
    where cq.characterid = ${characterId}
  `;
  const shaped = cq.map(c => ({
    questId: c.questid,
    status: c.status,
    progress: c.progress,
    claimedRewards: c.claimedrewards,
    quest: { id: c.id, name: c.name, description: c.description, objectiveCount: c.objectivecount }
  }));
  const hasTutorial = cq.some(c => c.questid === TUTORIAL_QUEST_ID);
  const hasCraft = cq.some(c => c.questid === CRAFT_DAGGER_QUEST_ID);
  return NextResponse.json({ ok: true, characterQuests: shaped, tutorialAvailable: !hasTutorial, craftAvailable: !hasCraft });
}

export async function POST(req: Request) {
  const session = await getSession(); if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  type QuestBody = { action?: string; characterId?: string; questId?: string; progressDelta?: number };
  const body: QuestBody = await req.json().catch(() => ({} as QuestBody));
  const { action, characterId, questId, progressDelta } = body;
  if (!characterId || !action) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  await ensureTutorialQuest();
  await ensureCraftDaggerQuest();
  if (action === "accept") {
    const id = questId || TUTORIAL_QUEST_ID;
    // Validate acceptance requirements: quest exists, min level, previous quest completion if required
  const qr = await q<QuestRow>`select * from "Quest" where id = ${id}`;
  const qrow = qr[0];
    if (!qrow) return NextResponse.json({ ok: false, error: "quest_not_found" }, { status: 404 });
    // Character level check
  const ch = await q<{ level: number }>`select level from "Character" where id = ${characterId}`;
    if (!ch) return NextResponse.json({ ok: false, error: "no_char" }, { status: 400 });
    const reasons: string[] = [];
    const minLevel = qrow.minlevel ?? 1;
  if ((ch[0]?.level ?? 1) < minLevel) reasons.push(`Requires level ${minLevel}`);
    // Previous quest requirement
    if (qrow.requiresquestid) {
  const rq = await q<CharacterQuestRow>`select * from "CharacterQuest" where characterid = ${characterId} and questid = ${qrow.requiresquestid}`;
  if (!rq[0] || rq[0].status !== "COMPLETED") reasons.push("Requires previous quest completion");
    }
    if (reasons.length > 0) {
      return NextResponse.json({ ok: false, locked: true, reasons }, { status: 400 });
    }
    // Upsert as ACTIVE (even if already AVAILABLE)
    const newId = randomUUID();
    const up = await q<CharacterQuestRow>`
      insert into "CharacterQuest" (id, characterid, questid, status, progress)
      values (${newId}, ${characterId}, ${id}, 'ACTIVE', 0)
      on conflict (characterid, questid) do update set status = 'ACTIVE'
      returning *
    `;
    return NextResponse.json({ ok: true, characterQuest: up[0] });
  }
  if (action === "progress") {
    const id = questId || TUTORIAL_QUEST_ID;
  const qrow = (await q<QuestRow>`select * from "Quest" where id = ${id}`)[0];
    if (!qrow) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const cq = (await q<CharacterQuestRow>`select * from "CharacterQuest" where characterid = ${characterId} and questid = ${id}`)[0];
    if (!cq) return NextResponse.json({ ok: false, error: "not_active" }, { status: 400 });
    const delta = Math.max(0, Math.floor(progressDelta ?? 1));
    const next = Math.min(qrow.objectivecount, cq.progress + delta);
    const status = next >= qrow.objectivecount ? 'COMPLETED' : cq.status;
    const updated = await q<CharacterQuestRow>`
      update "CharacterQuest" set progress = ${next}, status = ${status}
      where characterid = ${characterId} and questid = ${id}
      returning *
    `;
    return NextResponse.json({ ok: true, characterQuest: updated[0] });
  }
  if (action === "abandon") {
    const id = questId || TUTORIAL_QUEST_ID;
    await q`delete from "CharacterQuest" where characterid = ${characterId} and questid = ${id}`;
    return NextResponse.json({ ok: true });
  }
  if (action === "complete") {
    const id = questId || TUTORIAL_QUEST_ID;
  const cq = (await q<CharacterQuestRow>`select * from "CharacterQuest" where characterid = ${characterId} and questid = ${id}`)[0];
    if (!cq) return NextResponse.json({ ok: false, error: "not_active" }, { status: 400 });
    if (cq.status !== "COMPLETED") return NextResponse.json({ ok: false, error: "not_ready" }, { status: 400 });
    if (cq.claimedrewards) return NextResponse.json({ ok: true, alreadyClaimed: true });
    // Generic DB-driven rewards
  const qrow = (await q<QuestRow>`select * from "Quest" where id = ${id}`)[0];
    if (!qrow) return NextResponse.json({ ok: false, error: "quest_not_found" }, { status: 404 });
  const ch = (await q<{ id: string; userid: string }>`select id, userid from "Character" where id = ${characterId}`)[0];
    if (!ch) return NextResponse.json({ ok: false, error: "no_char" }, { status: 400 });
    // Gold
    if ((qrow.rewardgold ?? 0) > 0) {
      try {
        await q`update "Character" set gold = gold + ${qrow.rewardgold ?? 0} where id = ${characterId}`;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ ok: false, error: "db_error", message }, { status: 500 });
      }
    }
    // EXP awards via central endpoint (absolute URL + cookies for auth)
    try {
      const origin = (() => {
        const env = process.env.NEXT_PUBLIC_BASE_URL;
        if (env && /^https?:\/\//i.test(env)) return env.replace(/\/$/, "");
        const o = req.headers.get("origin") || req.headers.get("x-forwarded-origin") || "";
        if (o && /^https?:\/\//i.test(o)) return o.replace(/\/$/, "");
        const xfProto = req.headers.get("x-forwarded-proto");
        const xfHost = req.headers.get("x-forwarded-host");
        if (xfHost) {
          const proto = xfProto && /https/i.test(xfProto) ? "https" : "http";
          return `${proto}://${xfHost}`;
        }
        const host = req.headers.get("host");
        if (host) {
          const guessHttps = /:443$/.test(host) || /https/i.test(xfProto || "");
          return `${guessHttps ? "https" : "http"}://${host}`;
        }
        return "http://localhost:3000";
      })();
      const cookie = req.headers.get("cookie");
      await fetch(`${origin}/api/account/characters/exp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
        body: JSON.stringify({ characterId, exp: qrow.rewardexp ?? 0, miningExp: qrow.rewardminingexp ?? 0, craftingExp: qrow.rewardcraftingexp ?? 0 })
      });
    } catch {}
    // Grant item rewards
    const granted: Record<string, number> = {};
    const rewards = await q<{ itemid: string; qty: number }>`select itemid, qty from "QuestRewardItem" where questid = ${id}`;
    try {
      for (const it of rewards) {
        const curr = await q<{ count: number }>`select count from "ItemStack" where characterid = ${characterId} and itemkey = ${it.itemid}`;
        const newCount = Math.max(0, (curr[0]?.count ?? 0) + Math.max(1, it.qty));
        await q`insert into "ItemStack" (characterid, itemkey, count) values (${characterId}, ${it.itemid}, ${newCount}) on conflict (characterid, itemkey) do update set count = excluded.count`;
        granted[it.itemid] = (granted[it.itemid] ?? 0) + Math.max(1, it.qty);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ ok: false, error: "loot_error", message }, { status: 500 });
    }
    // Activate next quest in chain if defined
    if (qrow.nextquestid) {
      const chainId = randomUUID();
      await q`
        insert into "CharacterQuest" (id, characterid, questid, status, progress)
        values (${chainId}, ${characterId}, ${qrow.nextquestid}, 'ACTIVE', 0)
        on conflict (characterid, questid) do update set status = 'ACTIVE'
      `;
    }
    // Mark claimed
    try {
      await q`update "CharacterQuest" set claimedrewards = true where characterid = ${characterId} and questid = ${id}`;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ ok: false, error: "db_error", message }, { status: 500 });
    }
    // Return updated exp/level
  const ch2 = (await q<{ exp: number; level: number; craftingexp: number; craftinglevel: number }>`select exp, level, craftingexp, craftinglevel from "Character" where id = ${characterId}`)[0];
    return NextResponse.json({ ok: true, rewards: { gold: qrow.rewardgold ?? 0, exp: qrow.rewardexp ?? 0, miningExp: qrow.rewardminingexp ?? 0, craftingExp: qrow.rewardcraftingexp ?? 0 }, granted, nextQuest: qrow.nextquestid, exp: ch2?.exp, level: ch2?.level, craftingExp: ch2?.craftingexp, craftingLevel: ch2?.craftinglevel, claimedRewards: true });
  }
  return NextResponse.json({ ok: false, error: "unsupported" }, { status: 400 });
}
