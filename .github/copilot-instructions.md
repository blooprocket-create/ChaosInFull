# ChaosInFull AI Contributor Guide

Concise, project-specific instructions to help AI coding agents be productive immediately. Focus on actual patterns used today.

## Architecture Snapshot
- Monorepo root with `idle-chaos-website/` Next.js App Router project; game logic lives in `src/game` (Phaser) and web UX in `app/` + `src/components`.
- App Router API endpoints under `app/api/**/route.ts` (e.g. auth: `app/api/auth/login/route.ts`). Use `POST`, `GET` handlers returning `NextResponse.json`.
- Persistence: Neon serverless Postgres via lightweight tagged template wrapper `q<T>` in `src/lib/db.ts`; prefer `q<MyRow>` for typed results. Avoid ORM assumptions.
- Auth: Cookie-based JWT in `src/lib/auth.ts`; session helpers `getSession`, `createSession`, `destroySession`. Admin checks in `src/lib/authz.ts` combine allow-list env var `ADMIN_EMAILS` and DB flag `isadmin`.
- Telemetry: Client-side lazy init (`src/lib/telemetry.ts`) wiring Sentry + PostHog; emit events via `window.dispatchEvent(new CustomEvent('telemetry:event',{detail:{name,props}}))` or `capture(name, props)`.
- Game: Phaser singleton created via `createPhaserGame.ts` with dynamic imports of legacy JS scenes under `src/game/phaser/scenes/**`. Reuse/destroy guarded by `__GAME_REFCOUNT__`. Website embeds the canvas via `PhaserGameCanvas.tsx`.
- Quest & combat UI panels are React client components polling API routes and listening to custom DOM events fired by Phaser side (e.g. `questProgressChanged`). See `src/components/QuestPanel.tsx`, `CombatClient.tsx`.

## Conventions & Patterns
- TypeScript strict mode; legacy JS (Phaser scenes) intentionally ignored by ESLint (`eslint.config.mjs` `ignores: src/game/phaser/**`). Keep new web code in `.tsx/.ts`.
- Path alias: `@/*` maps to project root under `idle-chaos-website`. Prefer `import { q } from "@/src/lib/db"` style.
- Validation: Use `zod` at API edge (example: login schema in `app/api/auth/login/route.ts`). Match this pattern for new routes.
- Error handling: API routes return concise JSON `{ error: string }` with status codes; avoid throwing unless using `assertAdmin()`.
- Security: Never expose raw `passwordhash`; always verify with `verifyPassword`. JWT cookie name: `cif_token`; expiration 14d.
- DB extensions: `ensurePgcrypto()` ensures `gen_random_uuid()`. Call before operations needing UUID generation if not already ensured.
- Event bridging: Phaser sets global data on `window` (`ITEM_DEFS`, `QUEST_DEFS`, etc.) after dynamic imports. React components read via custom events rather than direct mutation.
- Singleton Phaser lifecycle: Always create via `createPhaserGame({ parent,... })`; release with `releasePhaserGame()` on unmount. Clean stray HUD/tooltips (see `PhaserGameCanvas.tsx`) when embedding.

## Adding API Routes (Example)
1. Create folder: `app/api/fishing/leaderboard/route.ts`.
2. Parse & validate input with `zod`.
3. Use `getSession()` for auth; `assertAdmin()` if restricted.
4. Query via `q<MyRow>`; handle empty arrays gracefully.
5. Return `NextResponse.json({ ok: true, data })`.

## Performance & Resource Notes
- Avoid recreating Phaser game; check for `window.GAME` reuse. Heavy dynamic imports gate first load.
- Polling: Keep intervals ≥300ms (see `CombatClient.tsx`) to reduce server load.
- Prefer aggregations server-side with SQL (see fishing event helpers in `db.ts`).

## Environment & Build
- Node ≥18; dev: `npm run dev`; build: `npm run build`; lint: `npm run lint`; typecheck via task invoking `tsc --noEmit`.
- Required env: `DATABASE_URL`, `JWT_SECRET`; optional telemetry: `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`.
- Vercel config (`vercel.json`) sets `installCommand: npm ci` + `buildCommand: npm run build`.

## When Modifying
- Keep Phaser JS isolated; don't convert scenes piecemeal unless coordinated (ESLint ignore). If touching scenes, maintain exported class names used in dynamic import destructuring (e.g. `{ Boot }`).
- For new world scenes, update `createPhaserGame.ts` import list and `worldMeta.ts` `SCENE_META` for website visibility.
- Extend telemetry by adding breadcrumb via `capture('event_name',{detail})`.

## Quick Reference
- Auth session: `const session = await getSession()`.
- Admin guard: `await assertAdmin()` throws if forbidden.
- SQL query typed: `const users = await q<UserRow>`select ...``.
- Emit telemetry: `capture('combat:start',{ zone })`.
- Dispatch quest event: `window.dispatchEvent(new Event('questProgressChanged'))` (Phaser side).

Please review and suggest edits if any section is unclear or missing critical patterns.
