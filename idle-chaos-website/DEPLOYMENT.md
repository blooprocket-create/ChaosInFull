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

Prisma (Postgres)
- Locally, you can point DATABASE_URL to Postgres and push:
  npm run prisma:pg:generate
  npm run prisma:pg:push

Vercel/Render
- Configure env vars above.
- Build command: npm run build
- Start command: npm start

Notes
- The project includes a separate schema for Postgres at prisma/schema.postgres.prisma.
- Admin seeding endpoints exist at /api/admin/seed (requires a session for an admin user).
