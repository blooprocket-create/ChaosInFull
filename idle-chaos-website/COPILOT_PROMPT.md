Chaos In Full Website - Copilot Prompt

Goal
- Build a beautiful, horror-themed site that feels like an app.
- Core flows: landing → signup/login → dashboard (stats).

Design
- Colors: black base, purple accents, desaturated grays, subtle red hints.
- Effects: gradient glows, noise, glassmorphism panels, tasteful motion.
- Typography: Cinzel for display, Roboto Mono for UI accents.

 Tech
 - Next.js App Router, TypeScript.
 - Tailwind CSS.
 - Neon Postgres with a small typed SQL helper (no ORM).
 - JWT cookies for auth using `jose`.

Constraints
- Use server components for data pages.
- Use client components minimally for forms.
- Keep routes under app/:
  - `/` landing
  - `/signup`, `/login`
  - `/dashboard` (protected)
  - `/api/auth/*` (signup, login, logout)

Quality
- Lint clean, typesafe, accessible labels.
- Extract utilities to `src/lib/`.

Next Enhancements
- User profile page, password reset, email verification.
- Dark horror SVG decorations and animated fog layer.
