Deployment (Beta Testing)

Prereqs
- A Postgres database URL (provided).
- A Next.js host (Vercel, Render, Fly.io, Railway, etc.).

Env vars (required)
- DATABASE_URL: your Postgres URL
- JWT_SECRET: a long random string
- NEXT_PUBLIC_APP_NAME: Chaos In Full
- ADMIN_EMAILS: comma-separated admin emails
- BASE_URL: public site base URL (e.g., https://chaos.example.com)

Database
- Use Neon (or any Postgres). Set DATABASE_URL accordingly.
- Schema is managed via code and seed endpoints (e.g., POST /api/admin/seed for local dev with an admin session).

Vercel/Render
- Configure env vars above.
- Build command: npm run build
- Start command: npm start

Notes
- Admin seeding endpoint exists at /api/admin/seed (requires a session for an admin user).
