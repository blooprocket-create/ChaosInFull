import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
// Avoid importing Prisma types directly in this environment; use narrowed shapes below

// Tutorial quest constants
const TUTORIAL_QUEST_ID = "tutorial_kill_slimes_5";
const CRAFT_DAGGER_QUEST_ID = "tutorial_craft_copper_dagger";

type QuestRow = { id: string; name: string; description: string; objectiveType: string; objectiveTarget: string; objectiveCount: number; nextQuestId?: string | null; rewardGold?: number; rewardExp?: number; rewardMiningExp?: number; rewardCraftingExp?: number; minLevel?: number; requiresQuestId?: string | null };
type CharacterQuestRow = { characterId: string; questId: string; status: "AVAILABLE" | "ACTIVE" | "COMPLETED"; progress: number; claimedRewards?: boolean };
const client = prisma as unknown as {
  npcDef: {
    upsert: (args: { where: { id: string }; update: Record<string, never> | Partial<{ name: string }>; create: { id: string; name: string } }) => Promise<{ id: string; name: string }>;
  };
  itemDef: {
    upsert: (args: { where: { id: string }; update: Record<string, never> | Partial<{ name: string; description?: string; sell?: number }> ; create: { id: string; name: string; description?: string; sell?: number } }) => Promise<void>;
  };
  quest: {
    findUnique: (args: { where: { id: string }; include?: { rewardItems?: boolean } }) => Promise<(QuestRow & { rewardItems?: Array<{ itemId: string; qty: number }> }) | null>;
    create: (args: { data: QuestRow & Partial<{ nextQuestId?: string | null; rewardGold?: number; rewardExp?: number; rewardMiningExp?: number; rewardCraftingExp?: number; minLevel?: number; requiresQuestId?: string | null; giverNpcId?: string | null }> }) => Promise<QuestRow>;
    upsert: (args: { where: { id: string }; update: Partial<QuestRow & { nextQuestId?: string | null; rewardGold?: number; rewardExp?: number; rewardMiningExp?: number; rewardCraftingExp?: number; minLevel?: number; requiresQuestId?: string | null; giverNpcId?: string | null }>; create: QuestRow & Partial<{ nextQuestId?: string | null; rewardGold?: number; rewardExp?: number; rewardMiningExp?: number; rewardCraftingExp?: number; minLevel?: number; requiresQuestId?: string | null; giverNpcId?: string | null }> }) => Promise<QuestRow>;
  };
  characterQuest: {
    findMany: (args: { where: { characterId: string }; include: { quest: boolean } }) => Promise<Array<CharacterQuestRow & { quest: QuestRow }>>;
    upsert: (args: { where: { characterId_questId: { characterId: string; questId: string } }; update: Partial<CharacterQuestRow>; create: { characterId: string; questId: string; status: string; progress: number } }) => Promise<CharacterQuestRow>;
    findUnique: (args: { where: { characterId_questId: { characterId: string; questId: string } } }) => Promise<(CharacterQuestRow & { claimedRewards?: boolean }) | null>;
    update: (args: { where: { characterId_questId: { characterId: string; questId: string } }; data: Partial<CharacterQuestRow> & { claimedRewards?: boolean } }) => Promise<CharacterQuestRow>;
    delete: (args: { where: { characterId_questId: { characterId: string; questId: string } } }) => Promise<void>;
  };
  character: {
  findUnique: (args: { where: { id: string }; select?: { id?: boolean; userId?: boolean; exp?: boolean; level?: boolean; craftingExp?: boolean; craftingLevel?: boolean } }) => Promise<{ id?: string; userId?: string; exp?: number; level?: number; craftingExp?: number; craftingLevel?: number } | null>;
    update: (args: { where: { id: string }; data: { exp?: { increment: number }; craftingExp?: { increment: number }; gold?: { increment: number } } }) => Promise<void>;
  };
  playerStat: {
    findUnique: (args: { where: { userId: string } }) => Promise<{ gold: number } | null>;
    update: (args: { where: { userId: string }; data: { gold: number } }) => Promise<void>;
    create?: (args: { data: { userId: string; gold: number } }) => Promise<void>;
  };
  questRewardItem: {
    findFirst: (args: { where: { questId: string; itemId: string } }) => Promise<{ id: string } | null>;
    create: (args: { data: { questId: string; itemId: string; qty: number } }) => Promise<void>;
  };
  itemStack: {
    findUnique: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } } }) => Promise<{ count: number } | null>;
    upsert: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } }; update: { count: number }; create: { characterId: string; itemKey: string; count: number } }) => Promise<void>;
  };
};

async function ensureTutorialQuest() {
  // Seed Grimsley NPC
  const grimsley = await client.npcDef.upsert({ where: { id: "grimsley" }, update: {}, create: { id: "grimsley", name: "Grimsley" } });
  // Ensure core quest reward items exist in ItemDef
  const requiredItems: Array<{ id: string; name: string; sell?: number }> = [
    { id: "copper_bar", name: "Copper Bar", sell: 8 },
    { id: "plank", name: "Plank", sell: 4 },
  ];
  for (const it of requiredItems) {
    await client.itemDef.upsert({ where: { id: it.id }, update: {}, create: { id: it.id, name: it.name, sell: it.sell } });
  }
  // Seed tutorial quest with DB-driven rewards and next quest link
  const q = await client.quest.upsert({
    where: { id: TUTORIAL_QUEST_ID },
    update: { name: "Can you punch?", description: "Kill 5 slimes in the field.", giverNpcId: grimsley.id, nextQuestId: CRAFT_DAGGER_QUEST_ID, rewardGold: 500, rewardExp: 250, minLevel: 1, requiresQuestId: null },
    create: {
      id: TUTORIAL_QUEST_ID,
      name: "Can you punch?",
      description: "Kill 5 slimes in the field.",
      objectiveType: "KILL",
      objectiveTarget: "slime",
      objectiveCount: 5,
      giverNpcId: grimsley.id,
      nextQuestId: CRAFT_DAGGER_QUEST_ID,
      rewardGold: 500,
      rewardExp: 250,
      minLevel: 1,
      requiresQuestId: null,
    }
  });
  // Reward items: 1x copper_bar and 1x plank
  const items: Array<{ itemId: string; qty: number }> = [
    { itemId: "copper_bar", qty: 1 },
    { itemId: "plank", qty: 1 },
  ];
  for (const it of items) {
    const exists = await client.questRewardItem.findFirst({ where: { questId: q.id, itemId: it.itemId } });
    if (!exists) await client.questRewardItem.create({ data: { questId: q.id, itemId: it.itemId, qty: it.qty } });
  }
}

async function ensureCraftDaggerQuest() {
  // Ensure dagger reward item exists for downstream quest progression
  await client.itemDef.upsert({ where: { id: "copper_dagger" }, update: {}, create: { id: "copper_dagger", name: "Copper Dagger", sell: 16 } });
  await client.quest.upsert({
    where: { id: CRAFT_DAGGER_QUEST_ID },
    update: { name: "Can you craft?", description: "Craft one copper dagger at the workbench.", rewardCraftingExp: 150, rewardExp: 150, requiresQuestId: TUTORIAL_QUEST_ID, minLevel: 1 },
    create: {
      id: CRAFT_DAGGER_QUEST_ID,
      name: "Can you craft?",
      description: "Craft one copper dagger at the workbench.",
      objectiveType: "CRAFT",
      objectiveTarget: "copper_dagger",
      objectiveCount: 1,
      rewardCraftingExp: 150,
      rewardExp: 150,
      requiresQuestId: TUTORIAL_QUEST_ID,
      minLevel: 1,
    }
  });
}

export async function GET(req: Request) {
  const session = await getSession(); if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("characterId") || "";
  if (!characterId) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  await ensureTutorialQuest();
  await ensureCraftDaggerQuest();
  const cq = await client.characterQuest.findMany({ where: { characterId }, include: { quest: true } });
  // Make tutorial available if not present
  const hasTutorial = (cq as Array<CharacterQuestRow & { quest: QuestRow }>).some((c) => c.questId === TUTORIAL_QUEST_ID);
  const hasCraft = (cq as Array<CharacterQuestRow & { quest: QuestRow }>).some((c) => c.questId === CRAFT_DAGGER_QUEST_ID);
  return NextResponse.json({ ok: true, characterQuests: cq, tutorialAvailable: !hasTutorial, craftAvailable: !hasCraft });
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
    const q = await client.quest.findUnique({ where: { id } });
    if (!q) return NextResponse.json({ ok: false, error: "quest_not_found" }, { status: 404 });
    // Character level check
    const ch = await client.character.findUnique({ where: { id: characterId }, select: { id: true, level: true } });
    if (!ch) return NextResponse.json({ ok: false, error: "no_char" }, { status: 400 });
    const reasons: string[] = [];
    const minLevel = q.minLevel ?? 1;
    if ((ch.level ?? 1) < minLevel) reasons.push(`Requires level ${minLevel}`);
    // Previous quest requirement
    if (q.requiresQuestId) {
      const rq = await client.characterQuest.findUnique({ where: { characterId_questId: { characterId, questId: q.requiresQuestId } } });
      if (!rq || rq.status !== "COMPLETED") reasons.push("Requires previous quest completion");
    }
    if (reasons.length > 0) {
      return NextResponse.json({ ok: false, locked: true, reasons }, { status: 400 });
    }
    // Upsert as ACTIVE (even if already AVAILABLE)
    const cq = await client.characterQuest.upsert({
      where: { characterId_questId: { characterId, questId: id } },
      update: { status: "ACTIVE" },
      create: { characterId, questId: id, status: "ACTIVE", progress: 0 }
    });
    return NextResponse.json({ ok: true, characterQuest: cq });
  }
  if (action === "progress") {
    const id = questId || TUTORIAL_QUEST_ID;
    const q = await client.quest.findUnique({ where: { id } });
    if (!q) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    const cq = await client.characterQuest.findUnique({ where: { characterId_questId: { characterId, questId: id } } });
    if (!cq) return NextResponse.json({ ok: false, error: "not_active" }, { status: 400 });
    const delta = Math.max(0, Math.floor(progressDelta ?? 1));
    const next = Math.min(q.objectiveCount, cq.progress + delta);
    const status = next >= q.objectiveCount ? "COMPLETED" : cq.status;
    const updated = await client.characterQuest.update({ where: { characterId_questId: { characterId, questId: id } }, data: { progress: next, status } });
    return NextResponse.json({ ok: true, characterQuest: updated });
  }
  if (action === "abandon") {
    const id = questId || TUTORIAL_QUEST_ID;
    // Remove the characterQuest row to allow re-accepting later
    await client.characterQuest.delete({ where: { characterId_questId: { characterId, questId: id } } }).catch(() => {});
    return NextResponse.json({ ok: true });
  }
  if (action === "complete") {
    const id = questId || TUTORIAL_QUEST_ID;
    const cq = await client.characterQuest.findUnique({ where: { characterId_questId: { characterId, questId: id } } });
    if (!cq) return NextResponse.json({ ok: false, error: "not_active" }, { status: 400 });
    if (cq.status !== "COMPLETED") return NextResponse.json({ ok: false, error: "not_ready" }, { status: 400 });
    if (cq.claimedRewards) return NextResponse.json({ ok: true, alreadyClaimed: true });
    // Generic DB-driven rewards
  const q = await client.quest.findUnique({ where: { id }, include: { rewardItems: true } });
    if (!q) return NextResponse.json({ ok: false, error: "quest_not_found" }, { status: 404 });
  const ch = await client.character.findUnique({ where: { id: characterId }, select: { id: true, userId: true } });
    if (!ch) return NextResponse.json({ ok: false, error: "no_char" }, { status: 400 });
    // Gold
    if ((q.rewardGold ?? 0) > 0) {
      await client.character.update({ where: { id: characterId }, data: { gold: { increment: q.rewardGold ?? 0 } } });
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
        body: JSON.stringify({ characterId, exp: q.rewardExp ?? 0, miningExp: q.rewardMiningExp ?? 0, craftingExp: q.rewardCraftingExp ?? 0 })
      });
    } catch {}
    // Grant item rewards
    const granted: Record<string, number> = {};
    for (const it of (q.rewardItems || [])) {
      const curr = await client.itemStack.findUnique({ where: { characterId_itemKey: { characterId, itemKey: it.itemId } } });
      const newCount = Math.max(0, (curr?.count ?? 0) + Math.max(1, it.qty));
      await client.itemStack.upsert({ where: { characterId_itemKey: { characterId, itemKey: it.itemId } }, update: { count: newCount }, create: { characterId, itemKey: it.itemId, count: newCount } });
      granted[it.itemId] = (granted[it.itemId] ?? 0) + Math.max(1, it.qty);
    }
    // Activate next quest in chain if defined
    if (q.nextQuestId) {
      await client.characterQuest.upsert({ where: { characterId_questId: { characterId, questId: q.nextQuestId } }, update: { status: "ACTIVE" }, create: { characterId, questId: q.nextQuestId, status: "ACTIVE", progress: 0 } });
    }
    // Mark claimed
  await client.characterQuest.update({ where: { characterId_questId: { characterId, questId: id } }, data: { claimedRewards: true } });
    // Return updated exp/level
  const ch2 = await client.character.findUnique({ where: { id: characterId }, select: { exp: true, level: true, craftingExp: true, craftingLevel: true } });
  return NextResponse.json({ ok: true, rewards: { gold: q.rewardGold ?? 0, exp: q.rewardExp ?? 0, miningExp: q.rewardMiningExp ?? 0, craftingExp: q.rewardCraftingExp ?? 0 }, granted, nextQuest: q.nextQuestId, exp: ch2?.exp, level: ch2?.level, craftingExp: ch2?.craftingExp, craftingLevel: ch2?.craftingLevel });
  }
  return NextResponse.json({ ok: false, error: "unsupported" }, { status: 400 });
}
