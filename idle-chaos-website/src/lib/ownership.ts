import { sql } from "@/src/lib/db";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

export async function assertCharacterOwner(userId: string, characterId: string) {
  const rows = await (sql`
    select userid from "Character" where id = ${characterId} limit 1
  ` as unknown as Array<{ userid: string }>);
  const ch = rows[0];
  if (!ch || ch.userid !== userId) {
    throw new HttpError(403, "forbidden");
  }
  return { id: characterId, userId: ch.userid };
}
