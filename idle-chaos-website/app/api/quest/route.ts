import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
// Avoid importing Prisma types directly in this environment; use narrowed shapes below

// Tutorial quest constants
const TUTORIAL_QUEST_ID = "tutorial_kill_slimes_5";
const CRAFT_DAGGER_QUEST_ID = "tutorial_craft_copper_dagger";

type QuestRow = { id: string; name: string; description: string; objectiveType: string; objectiveTarget: string; objectiveCount: number };
type CharacterQuestRow = { characterId: string; questId: string; status: "AVAILABLE" | "ACTIVE" | "COMPLETED"; progress: number; claimedRewards?: boolean };
const client = prisma as unknown as {
  quest: {
    findUnique: (args: { where: { id: string } }) => Promise<QuestRow | null>;
    create: (args: { data: QuestRow }) => Promise<QuestRow>;
  };
  characterQuest: {
    findMany: (args: { where: { characterId: string }; include: { quest: boolean } }) => Promise<Array<CharacterQuestRow & { quest: QuestRow }>>;
    upsert: (args: { where: { characterId_questId: { characterId: string; questId: string } }; update: Partial<CharacterQuestRow>; create: { characterId: string; questId: string; status: string; progress: number } }) => Promise<CharacterQuestRow>;
    findUnique: (args: { where: { characterId_questId: { characterId: string; questId: string } } }) => Promise<(CharacterQuestRow & { claimedRewards?: boolean }) | null>;
    update: (args: { where: { characterId_questId: { characterId: string; questId: string } }; data: Partial<CharacterQuestRow> & { claimedRewards?: boolean } }) => Promise<CharacterQuestRow>;
    delete: (args: { where: { characterId_questId: { characterId: string; questId: string } } }) => Promise<void>;
  };
  character: {
    findUnique: (args: { where: { id: string } }) => Promise<{ id: string; userId: string } | null>;
    update: (args: { where: { id: string }; data: { exp?: { increment: number }; craftingExp?: { increment: number } } }) => Promise<void>;
  };
  playerStat: {
    findUnique: (args: { where: { userId: string } }) => Promise<{ gold: number } | null>;
    update: (args: { where: { userId: string }; data: { gold: number } }) => Promise<void>;
  };
  itemStack: {
    findUnique: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } } }) => Promise<{ count: number } | null>;
    upsert: (args: { where: { characterId_itemKey: { characterId: string; itemKey: string } }; update: { count: number }; create: { characterId: string; itemKey: string; count: number } }) => Promise<void>;
  };
};

async function ensureTutorialQuest() {
  const q = await client.quest.findUnique({ where: { id: TUTORIAL_QUEST_ID } });
  if (!q) {
    await client.quest.create({ data: {
      id: TUTORIAL_QUEST_ID,
      name: "Slime Introduction",
      description: "Grimsly wants you to pop 5 slimes in the field to prove you can survive the oozing laughter.",
      objectiveType: "KILL",
      objectiveTarget: "slime",
      objectiveCount: 5
    }});
  }
}

async function ensureCraftDaggerQuest() {
  const q = await client.quest.findUnique({ where: { id: CRAFT_DAGGER_QUEST_ID } });
  if (!q) {
    await client.quest.create({ data: {
      id: CRAFT_DAGGER_QUEST_ID,
      name: "Make A Copper Dagger",
      description: "Grimsly needs proof you can shape metal. Craft one copper dagger at the workbench.",
      objectiveType: "CRAFT",
      objectiveTarget: "copper_dagger",
      objectiveCount: 1,
    }});
  }
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
    // Rewards by quest
  if (id === TUTORIAL_QUEST_ID) {
      // Give 500 gold to PlayerStat and 250 character XP
      const ch = await client.character.findUnique({ where: { id: characterId } });
      if (!ch) return NextResponse.json({ ok: false, error: "no_char" }, { status: 400 });
      let ps = await client.playerStat.findUnique({ where: { userId: ch.userId } });
      const newGold = (ps?.gold ?? 0) + 500;
      if (!ps) {
        await prisma.playerStat.create({ data: { userId: ch.userId, gold: newGold } as any }).catch(()=>{});
      } else {
        await client.playerStat.update({ where: { userId: ch.userId }, data: { gold: newGold } });
      }
      // Proper EXP award: call EXP endpoint to compute levels
      try {
        await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, exp: 250 }) });
      } catch {}
      const ch2 = await prisma.character.findUnique({ where: { id: characterId }, select: { exp: true, level: true } });
      // Grant materials for next quest and auto-accept it if not present
      const nextQuestId = CRAFT_DAGGER_QUEST_ID;
      await client.characterQuest.upsert({
        where: { characterId_questId: { characterId, questId: nextQuestId } },
        update: { status: "ACTIVE" },
        create: { characterId, questId: nextQuestId, status: "ACTIVE", progress: 0 },
      });
      // Grant 1x copper_bar and 1x plank
      const grant = async (itemKey: string, qty: number) => {
        const curr = await client.itemStack.findUnique({ where: { characterId_itemKey: { characterId, itemKey } } });
        const newCount = Math.max(0, (curr?.count ?? 0) + qty);
        await client.itemStack.upsert({ where: { characterId_itemKey: { characterId, itemKey } }, update: { count: newCount }, create: { characterId, itemKey, count: newCount } });
      };
      await grant("copper_bar", 1);
      await grant("plank", 1);
      await client.characterQuest.update({ where: { characterId_questId: { characterId, questId: id } }, data: { claimedRewards: true } });
      return NextResponse.json({ ok: true, rewards: { gold: 500, exp: 250 }, granted: { copper_bar: 1, plank: 1 }, nextQuest: nextQuestId, exp: ch2?.exp, level: ch2?.level });
    }
    if (id === CRAFT_DAGGER_QUEST_ID) {
      // 150 crafting XP + 150 character XP computed via EXP endpoint
      try {
        await fetch("/api/account/characters/exp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId, craftingExp: 150, exp: 150 }) });
      } catch {}
      const ch2 = await prisma.character.findUnique({ where: { id: characterId }, select: { exp: true, level: true, craftingExp: true, craftingLevel: true } });
      await client.characterQuest.update({ where: { characterId_questId: { characterId, questId: id } }, data: { claimedRewards: true } });
      return NextResponse.json({ ok: true, rewards: { craftingExp: 150, exp: 150 }, exp: ch2?.exp, level: ch2?.level, craftingExp: ch2?.craftingExp, craftingLevel: ch2?.craftingLevel });
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "unsupported" }, { status: 400 });
}
