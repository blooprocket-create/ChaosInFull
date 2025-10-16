import { prisma } from "@/src/lib/prisma";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

export async function assertCharacterOwner(userId: string, characterId: string) {
  const ch = await prisma.character.findUnique({ where: { id: characterId } });
  if (!ch || ch.userId !== userId) {
    throw new HttpError(403, "forbidden");
  }
  return ch;
}
