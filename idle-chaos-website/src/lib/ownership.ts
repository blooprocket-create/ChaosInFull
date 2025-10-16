import { prisma } from "@/src/lib/prisma";

export async function assertCharacterOwner(userId: string, characterId: string) {
  const ch = await prisma.character.findUnique({ where: { id: characterId } });
  if (!ch || ch.userId !== userId) {
    const err = new Error("forbidden");
    (err as any).status = 403;
    throw err;
  }
  return ch;
}
