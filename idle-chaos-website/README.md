# Chaos In Full - Website

A horror-themed, professional-grade Next.js site for account creation and player stats. Built with Next.js App Router, TypeScript, Tailwind CSS, and Neon (serverless Postgres).

## Features
- Landing page with dark/horror style
- Email/username sign up and login (JWT cookies)
- Protected dashboard displaying basic player stats
- Serverless Postgres (Neon) via a tiny typed SQL helper

## Getting Started

1. Copy environment:
	- Duplicate `.env.example` to `.env` and fill `JWT_SECRET`.
2. Install deps:
	- `npm install`
3. Create database schema and seed (optional):
	- Set `DATABASE_URL` to your Postgres (Neon) connection string
	- Start dev and call the admin seed route if needed: POST /api/admin/seed (requires admin)
4. Run dev server:
	- `npm run dev` and visit http://localhost:3000

## Deploy to Vercel
- Set env vars on Vercel:
	- `DATABASE_URL` (Neon Postgres)
  - `JWT_SECRET`
  - `NEXT_PUBLIC_APP_NAME`
  - `BASE_URL`
- Build command: `npm run build`
- Output: `.next`

## Roadmap (Website)
- Polished horror visuals (SVG filters, animated fog, cursor trails)
- User profile editing and avatar
- Admin tools and moderation
- Game client embed/launcher

## Security Notes
- JWT cookies are httpOnly and lax same-site by default; rotate `JWT_SECRET` if compromised.
- Rate-limit auth routes in production (e.g., using middleware or an edge rate limiter).
