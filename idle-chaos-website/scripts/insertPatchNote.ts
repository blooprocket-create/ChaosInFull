import { prisma } from "../src/lib/prisma";

async function main() {
  const date = new Date().toISOString().slice(0, 10);
  const version = "0.0.11";
  const title = "Combat & AFK Polishing + Admin Fixes";
  const highlights = [
    "Mob respawns now wait a short delay and rotate spawn slots (no instant pile-ups)",
    "AFK rewards require at least 60s elapsed and update your EXP/Level HUD immediately on return",
    "World Editor/Admin: fixed dynamic route typing and portal editing",
    "Spawn safety: Slime zones will populate even if DB spawn configs are empty",
  ];
  const notes = [
    "Improved keyboard handling so Space attacks only when not typing",
    "Fixed Prisma relation for Portal targets; DB schema validates and pushes cleanly",
    "News page reads DB patch notes first, falling back to static data if empty",
  ];
  const row = await (prisma as any).patchNote.create({ data: { date: new Date(date), version, title, highlights, notes } });
  console.log("Inserted patch note:", row);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
