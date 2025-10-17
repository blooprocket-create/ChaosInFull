-- Chaos In Full • PostgreSQL schema for Neon
-- This mirrors prisma/schema.postgres.prisma using TEXT ids (cuid generated app-side)

create table if not exists "User" (
  id           text primary key,
  email        text not null unique,
  username     text not null unique,
  passwordHash text not null,
  isAdmin      boolean not null default false,
  createdAt    timestamptz not null default now(),
  updatedAt    timestamptz not null default now()
);

create table if not exists "PlayerStat" (
  id           text primary key,
  userId       text not null unique references "User"(id) on delete cascade,
  level        integer not null default 1,
  class        text not null default 'Beginner',
  exp          integer not null default 0,
  gold         integer not null default 0,
  premiumGold  integer not null default 0,
  hp           integer not null default 100,
  mp           integer not null default 50,
  strength     integer not null default 1,
  agility      integer not null default 1,
  intellect    integer not null default 1,
  luck         integer not null default 1,
  updatedAt    timestamptz not null default now()
);

create table if not exists "Character" (
  id             text primary key,
  userId         text not null references "User"(id) on delete cascade,
  name           text not null,
  class          text not null default 'Beginner',
  gender         text not null,
  hat            text not null,
  level          integer not null default 1,
  exp            integer not null default 0,
  gold           integer not null default 0,
  miningExp      integer not null default 0,
  miningLevel    integer not null default 1,
  woodcuttingExp integer not null default 0,
  woodcuttingLevel integer not null default 1,
  craftingExp    integer not null default 0,
  craftingLevel  integer not null default 1,
  fishingExp     integer not null default 0,
  fishingLevel   integer not null default 1,
  seenWelcome    boolean not null default false,
  lastScene      text not null default 'Town',
  lastSeenAt     timestamptz not null default now(),
  createdAt      timestamptz not null default now(),
  updatedAt      timestamptz not null default now(),
  unique(userId, name)
);

create table if not exists "ItemStack" (
  id           text primary key,
  characterId  text not null references "Character"(id) on delete cascade,
  itemKey      text not null,
  count        integer not null default 0,
  updatedAt    timestamptz not null default now(),
  unique(characterId, itemKey)
);

create table if not exists "CraftQueue" (
  id           text primary key,
  characterId  text not null unique references "Character"(id) on delete cascade,
  furnace      jsonb,
  workbench    jsonb,
  sawmill      jsonb,
  updatedAt    timestamptz not null default now()
);

create table if not exists "AccountItemStack" (
  id        text primary key,
  userId    text not null references "User"(id) on delete cascade,
  itemKey   text not null,
  count     integer not null default 0,
  updatedAt timestamptz not null default now(),
  unique(userId, itemKey)
);

create table if not exists "ChatMessage" (
  id          text primary key,
  userId      text not null references "User"(id) on delete cascade,
  characterId text references "Character"(id) on delete set null,
  text        text not null,
  createdAt   timestamptz not null default now(),
  scene       text not null default 'Town'
);

create table if not exists "ItemDef" (
  id          text primary key,
  name        text not null,
  description text not null default '',
  rarity      text not null default 'common',
  stackable   boolean not null default true,
  maxStack    integer not null default 999,
  buy         bigint not null default 0,
  sell        bigint not null default 0,
  createdAt   timestamptz not null default now(),
  updatedAt   timestamptz not null default now()
);

create table if not exists "EnemyTemplate" (
  id        text primary key,
  name      text not null,
  level     integer not null default 1,
  baseHp    integer not null default 30,
  expBase   integer not null default 5,
  goldMin   integer not null default 1,
  goldMax   integer not null default 3,
  tags      text not null default '',
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create table if not exists "DropTable" (
  id          text primary key,
  templateId  text not null unique references "EnemyTemplate"(id) on delete cascade,
  createdAt   timestamptz not null default now(),
  updatedAt   timestamptz not null default now()
);

create table if not exists "DropEntry" (
  id          text primary key,
  dropTableId text not null references "DropTable"(id) on delete cascade,
  itemId      text not null references "ItemDef"(id) on delete cascade,
  weight      integer not null default 1,
  minQty      integer not null default 1,
  maxQty      integer not null default 1,
  uniqueRoll  boolean not null default false
);

create table if not exists "ZoneDef" (
  id        text primary key,
  name      text not null,
  sceneKey  text not null,
  width     integer not null default 800,
  height    integer not null default 600,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create table if not exists "SpawnConfig" (
  id         text primary key,
  zoneId     text not null references "ZoneDef"(id) on delete cascade,
  templateId text not null references "EnemyTemplate"(id) on delete cascade,
  budget     integer not null default 6,
  respawnMs  integer not null default 1200,
  slots      jsonb,
  phaseType  text not null default 'personal'
);

create table if not exists "PortalDef" (
  id           text primary key,
  zoneId       text not null references "ZoneDef"(id) on delete cascade,
  targetZoneId text not null references "ZoneDef"(id) on delete cascade,
  x            integer not null,
  y            integer not null,
  radius       integer not null default 32,
  label        text not null default '',
  createdAt    timestamptz not null default now(),
  updatedAt    timestamptz not null default now()
);

create table if not exists "NpcDef" (
  id        text primary key,
  name      text not null,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now()
);

create table if not exists "Quest" (
  id                text primary key,
  name              text not null,
  description       text not null,
  objectiveType     text not null,
  objectiveTarget   text not null,
  objectiveCount    integer not null,
  giverNpcId        text references "NpcDef"(id) on delete set null,
  nextQuestId       text,
  minLevel          integer not null default 1,
  requiresQuestId   text,
  rewardGold        integer not null default 0,
  rewardExp         integer not null default 0,
  rewardMiningExp   integer not null default 0,
  rewardCraftingExp integer not null default 0,
  createdAt         timestamptz not null default now(),
  updatedAt         timestamptz not null default now()
);

create table if not exists "CharacterQuest" (
  id              text primary key,
  characterId     text not null references "Character"(id) on delete cascade,
  questId         text not null references "Quest"(id) on delete cascade,
  status          text not null default 'ACTIVE',
  progress        integer not null default 0,
  claimedRewards  boolean not null default false,
  createdAt       timestamptz not null default now(),
  updatedAt       timestamptz not null default now(),
  unique(characterId, questId)
);

create table if not exists "QuestRewardItem" (
  id        text primary key,
  questId   text not null references "Quest"(id) on delete cascade,
  itemId    text not null references "ItemDef"(id) on delete cascade,
  qty       integer not null default 1
);

create table if not exists "AfkCombatState" (
  id            text primary key,
  characterId   text not null unique references "Character"(id) on delete cascade,
  zone          text not null,
  auto          boolean not null default false,
  startedAt     timestamptz,
  lastSnapshot  timestamptz,
  pendingLoot   jsonb,
  createdAt     timestamptz not null default now(),
  updatedAt     timestamptz not null default now()
);

create table if not exists "PatchNote" (
  id         text primary key,
  date       date not null,
  version    text not null,
  title      text not null,
  highlights jsonb not null,
  notes      jsonb,
  createdAt  timestamptz not null default now(),
  updatedAt  timestamptz not null default now()
);
