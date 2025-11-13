# ChaosInFull / idle-chaos-website — AI Agent Working Notes

These instructions make an AI agent immediately productive in this Next.js + Phaser + Neon Postgres codebase.

## Stack & Architecture
- Framework: Next.js App Router (Node >=18), TypeScript, Tailwind CSS. Game client embedded with Phaser under route `/phaser`.
- Data: Serverless Postgres (Neon). No ORM—typed template tag helper `q<T>` in `src/lib/db.ts` executes SQL.
- Auth: JWT (HS256) stored as httpOnly cookie `cif_token` via helpers in `src/lib/auth.ts` (`createSession`, `getSession`).
- Authorization: Admin check pattern in `src/lib/authz.ts` (`requireAdmin`, optional email allow-list env var `ADMIN_EMAILS`).
- Telemetry: Optional Sentry + PostHog initialized lazily in `src/lib/telemetry.ts` and bridged by custom `window.dispatchEvent(new CustomEvent('telemetry:event', ...))`.
- Game runtime: `src/game/createPhaserGame.ts` implements a singleton Phaser instance with ref counting + dynamic scene/data module imports; `PhaserGameCanvas.tsx` (client component) mounts and ensures visibility + cleanup.
- Persistence Bridge: `src/lib/clientPersistence.ts` exposes `window.__cif_persist` for Phaser scenes (character patches, inventory, quests, talents, skill XP batching).

## Key Patterns & Conventions
- Server Components by default; add `"use client"` only where interactivity/state is required (forms, game canvas, persistence bridge).
- API Routes live under `app/api/**/route.ts`; many export `export const dynamic = "force-dynamic"` to guarantee fresh server execution (avoid caching). Follow this when introducing stateful endpoints.
- Lazy Schema Provisioning: Functions `ensure*` in `src/lib/db.ts` create/alter tables on demand. When adding new gameplay data, prefer extending the flexible JSONB `data` column (`ensureCharacterExtraColumns`) unless you need indexed queries—then add a dedicated column plus an `ensure...Column` helper.
- Character State: Single authoritative JSONB column `data` plus selective dedicated columns (e.g. gold, positional fields) for performance. See migration rationale in `scripts/MIGRATION_GUIDE.md` & `PURE_JSONB_COMPLETE.md`.
- Error Handling Philosophy: Provision helpers swallow creation errors (best-effort) to keep gameplay running even if migration privileges are limited.
- Skill XP: Use queued batching via `window.__cif_persist.queueSkillXp` for frequent increments; server consolidation endpoint `/api/account/characters/xp` updates levels + base stats.
- Telemetry Events: Fire lightweight browser CustomEvents (`telemetry:event`) rather than coupling scenes/components directly to analytics vendors.
- Phaser Integration: All scene/data modules are dynamically imported; expose globals (ITEM_DEFS, QUEST_DEFS, etc.) on `window` only inside `createPhaserGame`—avoid duplicate imports elsewhere.
- Inventory & Quests: Server endpoints expect maps; client converts to legacy slot arrays. Send sanitized integer counts only.

## Typical Developer Workflows
- Install deps: `npm install` (or use workspace task "Install deps").
- Dev server: `npm run dev` (task: "Dev (Next.js)").
- Build: `npm run build` (task: "Build (Next.js)"). If build fails, inspect recent changes to dynamic imports or missing env vars (`DATABASE_URL`, `JWT_SECRET`).
- Lint & Typecheck: Combined task "Typecheck+Lint" (runs `tsc --noEmit` then `eslint .`). Keep code strictly type-safe; `tsconfig.json` has `strict: true`.
- Environment: Duplicate `.env.example` → `.env`; minimally define `JWT_SECRET`, `DATABASE_URL`, optional telemetry keys (`NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`).

## Adding / Modifying Data & Features
- New DB feature: Add an `ensureMyFeatureColumn()` or table creation function mirroring existing style; call it inside the relevant API route before queries.
- New Gameplay Field: Patch via `/api/account/characters/patch`—just include the field in the JSON body; server merges into `data` automatically.
- Indexed Query Need: Create a dedicated column + index; keep field mirrored in `data` if client flexibility desired.
- New API Route: Place under `app/api/<domain>/route.ts`; import `getSession()` for auth; run needed `ensure*` functions early; return `NextResponse.json({ ok: true, ... })` on success.
- Admin-only route: Use `requireAdmin()` or `assertAdmin()`; return 403 (or throw) if null.

## Game Client Integration Notes
- Always mount Phaser through `PhaserGameCanvas`—do NOT instantiate `new Phaser.Game` elsewhere (singleton reuse + race avoidance logic lives there).
- To persist character changes from scenes, rely on `window.__cif_persist.saveCharacterPatch(characterId, patch)`; build patches with minimal fields (gold, flags, position) to reduce bandwidth.
- For frequent XP ticks (e.g. mining), call `queueSkillXp` instead of `grantSkillXp` directly.
- Cleanups are aggressive: HUD/tooltips/modals removed on unmount to prevent bleed—when adding new overlay elements ensure they have unique IDs ending with `-hud` or `-modal` for consistent teardown.

## Security & Auth
- Session lookup: Always trust `getSession()` for current user; avoid manually parsing cookies.
- Admin determination: Email allow-list (env `ADMIN_EMAILS`) OR `User.isadmin` column. Maintain this dual path.
- Cookie options: httpOnly, lax same-site, 14d expiry; adjust `createSession` only if security model changes.

## Telemetry & Diagnostics
- Emit events via `capture(name, props)` or DOM Event bridge; keep properties small & serializable.
- Debugging Phaser canvas issues: Temporary overlay created in dev mode (`phaser-debug-overlay`); check logs from `PhaserGameCanvas` for attachment/visibility repairs.

## Style & Quality Expectations
- Keep lint/type clean; leverage strict null checks instead of broad `any`.
- Swallow recoverable operational errors (migration, telemetry init) but log meaningful warnings for data inconsistencies.
- Prefer incremental `ensure*` provisioning over manual SQL scripts at runtime; large structural changes documented in `scripts/*.md`.

## Examples
- Typed query: `const users = await q<{ id: string; email: string }>
  \
  `select id, email from "User" limit 10`;`
- Character patch: `await fetch('/api/account/characters/patch', { method: 'POST', body: JSON.stringify({ characterId, gold: 250, flags: { tutorialCompleted: true } }) })`.
- Skill XP batch: `window.__cif_persist.queueSkillXp(charId, 'mining', 5);`

## When Unsure
Favor existing patterns: dynamic import + global exposure for game data; `ensure*` for schema; minimal client components; JSONB for flexible state. Ask if introducing heavy tooling (ORM, state library) or changing security model.

---
Feedback welcome: Which areas need deeper guidance (quest system, events, migrations, telemetry)? Provide any gaps and this document can iterate.
