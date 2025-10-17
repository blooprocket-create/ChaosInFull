import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function redact(url: string) {
  try {
    const u = new URL(url);
    if (u.password) u.password = "******";
    if (u.username) u.username = "******";
    return u.toString();
  } catch {
    return url ? "(unparseable value)" : "(empty)";
  }
}

export async function GET() {
  const raw = process.env.DATABASE_URL || "";
  const startsWith = raw.startsWith("postgresql://") || raw.startsWith("postgres://");
  const hasSSL = /sslmode=(require|prefer|verify|verify-full)/i.test(raw);
  return NextResponse.json({
    present: !!raw,
    startsWithPostgres: startsWith,
    hasSSLParam: hasSSL,
    redacted: raw ? redact(raw) : null,
    prefix: raw ? raw.slice(0, 16) : null
  });
}
