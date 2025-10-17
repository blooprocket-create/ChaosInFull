import { sql } from "@/src/lib/db";

let bugTableReady = false;

export async function ensureBugReportTable() {
  if (bugTableReady) return;
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
  } finally {
    bugTableReady = true;
  }
}
