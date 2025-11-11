import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(url);

export type UserRow = {
  id: string;
  email: string;
  username: string;
  passwordhash: string;
  isadmin: boolean;
};

// Typed helper for row-shaping with Neon SQL
// Usage: const rows = await q<MyType>`select ...`;
export type RowObject = Record<string, unknown>;

export function q<T extends RowObject = RowObject>(
  strings: TemplateStringsArray,
  ...params: unknown[]
): Promise<T[]> {
  const sqlFn = sql as unknown as (
    s: TemplateStringsArray,
    ...p: unknown[]
  ) => Promise<unknown>;
  return sqlFn(strings, ...params) as Promise<T[]>;
}

// Ensure pgcrypto exists for gen_random_uuid() usage
let pgcryptoChecked = false;
export async function ensurePgcrypto() {
  if (pgcryptoChecked) return;
  try {
    // Neon supports CREATE EXTENSION in a transactionless context; ignore errors in case of permissions
    await sql`create extension if not exists pgcrypto`;
  } catch {
    // Best-effort; continue even if extension cannot be created here
  } finally {
    pgcryptoChecked = true;
  }
}

let bugTableChecked = false;
export async function ensureBugReportTable() {
  if (bugTableChecked) return;
  try {
    await sql`
      create table if not exists "BugReport" (
        id text primary key,
        userid text references "User"(id) on delete set null,
        characterid text references "Character"(id) on delete set null,
        description text not null,
        screenshot text,
        status text not null default 'open',
        createdat timestamptz not null default now(),
        resolvedat timestamptz
      )
    `;
  } catch {
    // ignore
  } finally {
    bugTableChecked = true;
  }
}

// Fishing Event Stats table (for limited-time events like Intro to Fishing)
let fishingEventTableChecked = false;
export async function ensureFishingEventTable() {
  if (fishingEventTableChecked) return;
  try {
    await sql`
      create table if not exists "FishingEventStat" (
        eventkey text not null,
        userid text references "User"(id) on delete set null,
        username text,
        fishid text not null,
        fishname text,
        count int not null default 0,
        updatedat timestamptz not null default now(),
        primary key (eventkey, userid, fishid)
      )
    `;
    await sql`create index if not exists fish_event_key_idx on "FishingEventStat"(eventkey)`;
  } catch {
    // ignore table creation errors
  } finally {
    fishingEventTableChecked = true;
  }
}

// --- Game data tables (auto-provision if missing) ---
let characterTableChecked = false;
export async function ensureCharacterTable() {
  if (characterTableChecked) return;
  try {
    await sql`
      create table if not exists "Character" (
        id text primary key,
        userid text references "User"(id) on delete cascade,
        name text not null,
        class text not null,
        gender text,
        hat text,
        level int not null default 1,
        mininglevel int not null default 1,
        woodcuttinglevel int not null default 1,
        craftinglevel int not null default 1,
        fishinglevel int not null default 1,
        lastscene text,
        lastseenat timestamptz default now(),
        createdat timestamptz not null default now()
      )
    `;
    await sql`create index if not exists character_user_idx on "Character"(userid)`;
  } catch {
    // ignore
  } finally {
    characterTableChecked = true;
  }
}

// Pure JSONB approach - store ALL character state in a single flexible column
let characterExtrasChecked = false;
export async function ensureCharacterExtraColumns() {
  if (characterExtrasChecked) return;
  try {
    // Ensure base table exists first
    await ensureCharacterTable();
    // Add a flexible 'data' JSONB column to store ALL character state
    // This allows JS to dynamically add any fields without schema changes
    await sql`
      alter table "Character"
      add column if not exists data jsonb not null default '{}'::jsonb
    `;
    // Create indexes for common queries inside JSONB
    await sql`create index if not exists character_level_idx on "Character" ((data->>'level'))`.catch(() => {});
    await sql`create index if not exists character_lastscene_idx on "Character" ((data->>'lastScene'))`.catch(() => {});
  } catch {
    // ignore
  } finally {
    characterExtrasChecked = true;
  }
}

// Ensure dedicated base stat columns (str,int,agi,luk) for characters.
// These complement or replace any stats stored in JSONB 'data'.
let characterStatColsChecked = false;
export async function ensureCharacterStatColumns() {
  if (characterStatColsChecked) return;
  try {
    await ensureCharacterTable();
    // Add columns if not exists (lowercase names; Postgres folds identifiers)
    await sql`alter table "Character" add column if not exists str int not null default 1`;
    await sql`alter table "Character" add column if not exists int int not null default 1`;
    await sql`alter table "Character" add column if not exists agi int not null default 1`;
    await sql`alter table "Character" add column if not exists luk int not null default 1`;
  } catch {
    // ignore
  } finally {
    characterStatColsChecked = true;
  }
}

let itemStackTableChecked = false;
export async function ensureItemStackTable() {
  if (itemStackTableChecked) return;
  try {
    await sql`
      create table if not exists "ItemStack" (
        characterid text references "Character"(id) on delete cascade,
        itemkey text not null,
        count int not null default 0,
        primary key (characterid, itemkey)
      )
    `;
  } catch {
    // ignore
  } finally {
    itemStackTableChecked = true;
  }
}

let accountItemStackTableChecked = false;
export async function ensureAccountItemStackTable() {
  if (accountItemStackTableChecked) return;
  try {
    await sql`
      create table if not exists "AccountItemStack" (
        userid text references "User"(id) on delete cascade,
        itemkey text not null,
        count int not null default 0,
        primary key (userid, itemkey)
      )
    `;
  } catch {
    // ignore
  } finally {
    accountItemStackTableChecked = true;
  }
}

let playerStatTableChecked = false;
export async function ensurePlayerStatTable() {
  if (playerStatTableChecked) return;
  try {
    await sql`
      create table if not exists "PlayerStat" (
        userid text primary key references "User"(id) on delete cascade,
        strength int not null default 1,
        intellect int not null default 1,
        agility int not null default 1,
        luck int not null default 1
      )
    `;
  } catch {
    // ignore
  } finally {
    playerStatTableChecked = true;
  }
}

let characterQuestTableChecked = false;
export async function ensureCharacterQuestTable() {
  if (characterQuestTableChecked) return;
  try {
    await sql`
      create table if not exists "CharacterQuest" (
        characterid text references "Character"(id) on delete cascade,
        questid text not null,
        status text not null,
        progress jsonb,
        updatedat timestamptz not null default now(),
        primary key (characterid, questid)
      )
    `;
    await sql`create index if not exists characterquest_status_idx on "CharacterQuest"(status)`;
  } catch {
    // ignore
  } finally {
    characterQuestTableChecked = true;
  }
}

// Increment catch count for a user & fish under an event
export async function incrementFishingEventCatch(params: {
  eventKey: string;
  userId?: string | null;
  username?: string | null;
  fishId: string;
  fishName?: string | null;
}) {
  const { eventKey, userId, username, fishId, fishName } = params;
  if (!eventKey || !fishId) return;
  await ensureFishingEventTable();
  // Upsert via insert-on-conflict style (Neon Postgres supports ON CONFLICT)
  try {
    await sql`
      insert into "FishingEventStat" (eventkey, userid, username, fishid, fishname, count, updatedat)
      values (${eventKey}, ${userId || null}, ${username || null}, ${fishId}, ${fishName || null}, 1, now())
      on conflict (eventkey, userid, fishid)
      do update set count = "FishingEventStat".count + 1, updatedat = now()
    `;
  } catch {
    // swallow
  }
}

export type FishingEventLeaderboardRow = {
  username: string | null;
  userid: string | null;
  total: number;
};

// Fetch leaderboard aggregated per user for an event (top N by total count)
export async function getFishingEventLeaderboard(eventKey: string, limit = 25) {
  if (!eventKey) return [] as FishingEventLeaderboardRow[];
  await ensureFishingEventTable();
  try {
    const rows = await q<FishingEventLeaderboardRow>`
      select username, userid, sum(count)::int as total
      from "FishingEventStat"
      where eventkey = ${eventKey}
      group by username, userid
      order by total desc nulls last
      limit ${limit}
    `;
    return rows;
  } catch {
    return [] as FishingEventLeaderboardRow[];
  }
}

// Per-fish totals across all users for an event
export async function getFishingEventFishTotals(eventKey: string) {
  if (!eventKey) return [] as { fishid: string; fishname: string | null; total: number }[];
  await ensureFishingEventTable();
  try {
    const rows = await q<{ fishid: string; fishname: string | null; total: number }>`
      select fishid, max(fishname) as fishname, sum(count)::int as total
      from "FishingEventStat"
      where eventkey = ${eventKey}
      group by fishid
      order by total desc
    `;
    return rows;
  } catch {
    return [] as { fishid: string; fishname: string | null; total: number }[];
  }
}

// Fetch usernames for a list of user IDs (for enriching leaderboard)
export async function getUsernamesByIds(userIds: string[]) {
  if (!userIds || userIds.length === 0) return new Map<string, string>();
  try {
    const rows = await q<{ id: string; username: string }>`
      select id, username
      from "User"
      where id = any(${userIds})
    `;
    return new Map(rows.map(r => [r.id, r.username]));
  } catch {
    return new Map<string, string>();
  }
}
