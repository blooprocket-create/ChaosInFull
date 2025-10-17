-- Danger: full wipe of gameplay data. Use only in dev or with backups.
-- This resets sequences and cascades to dependent rows.

BEGIN;
  -- Order doesn't matter with CASCADE, but explicit list ensures coverage.
  TRUNCATE TABLE
    "ChatMessage",
    "QuestRewardItem",
    "CharacterQuest",
    "CraftQueue",
    "ItemStack",
    "AccountItemStack",
    "AfkCombatState",
    "PortalDef",
    "SpawnConfig",
    "DropEntry",
    "DropTable",
    "EnemyTemplate",
    "NpcDef",
    "ZoneDef",
    "ItemDef",
    "PatchNote",
    "Character",
    "PlayerStat",
    "User"
  RESTART IDENTITY CASCADE;
COMMIT;
