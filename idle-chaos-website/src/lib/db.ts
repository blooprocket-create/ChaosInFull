import { neon, neonConfig } from "@neondatabase/serverless";

// Use fetch for connection pooling in serverless/edge environments
neonConfig.fetchConnectionCache = true;

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
