# Chaos In Full • Neon DB setup

This folder contains raw SQL to provision a Neon (PostgreSQL) database that matches the app's Postgres schema.

Files:
- 001_schema.sql — Creates all tables/constraints.
- 002_seed.sql — Inserts baseline game content (items, zones, spawns, drops, tutorial quest, patch note).

## Prerequisites
- Neon Postgres project and database created
- psql available locally (or use Neon SQL console)

## Apply schema + seed
Using psql:

1) Set env vars (replace with your Neon details):

```powershell
$Env:PGHOST = "<neon-host>"
$Env:PGPORT = "5432"
$Env:PGDATABASE = "<db-name>"
$Env:PGUSER = "<user>"
$Env:PGPASSWORD = "<password>"
```

2) Run scripts:

```powershell
psql -f prisma/neon/001_schema.sql
psql -f prisma/neon/002_seed.sql
```

Alternatively, paste into Neon SQL Console in order.

## App configuration
- Set `DATABASE_URL` in Vercel/Env to your Neon connection string.
- The app uses a lightweight typed SQL helper (src/lib/db.ts) instead of Prisma.

## Notes
- IDs are text (cuid generated in app) to keep parity with Prisma.
- Monetary fields use numeric/bigint where appropriate.
- If you need to reset, drop tables or create a fresh database in Neon.