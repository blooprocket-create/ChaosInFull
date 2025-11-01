// Insert a patch note row into the database via Prisma
// Falls back to logging if Prisma is not configured

(async () => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const date = new Date('2025-10-31');
    const version = '0.0.13';
    const title = 'World sync: chaosinfull data, portals, and NPCs now reflected on the site';
    const highlights = [
      'World page now mirrors the live game: scenes, portals, NPCs, and enemies sourced from the chaosinfull runtime',
      'Enemy tables use authoritative ENEMY_DEFS (damage/EXP/gold/drops) from the game data',
      'Cave and Grave Forest details surfaced (mining + Wayne; woodcutting + Rowan); portal graph updated (Goblin path, Grave Forest → Broken Dock)',
      'Build hygiene: added typings for the new enemy data path; typecheck/lint/build are clean',
    ];
    const notes = [
      'New adapter: src/data/world-chaosinfull.ts replaces the outdated zones model',
      'WorldExplorer retargeted to the new adapter; SSR-safe client behavior preserved',
      'Added Broken Dock placeholder in the world list for portal consistency',
      'No gameplay balance changes in this patch—this is a data/UX sync across website and game',
    ];

    const row = await prisma.patchNote.create({
      data: { date, version, title, highlights, notes },
    });
    console.log('Inserted patch note:', row);
    await prisma.$disconnect();
  } catch (e) {
    console.error('Failed to insert patch note. If DB is not configured locally, this is expected. Details:', e?.message || e);
    process.exitCode = 1;
  }
})();
