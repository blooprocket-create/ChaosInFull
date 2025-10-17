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
