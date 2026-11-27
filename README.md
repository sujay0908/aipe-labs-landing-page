# AIPE Labs

Landing page and members-only LMS for AIPE Labs cohorts.

- `/` serves the original static landing page (`public/landing.html`), unchanged.
- `/login` sends a magic login link by email (Auth.js + Resend).
- `/learn/*` is for paid members only. Anyone else is sent to `/login`, or to Apply if they haven't paid.

Stack: Next.js on Vercel, Postgres on Supabase (via Drizzle ORM), Auth.js with database sessions.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run db:migrate           # creates the tables in the database
npm run dev
```

## Environment variables

Set these in `.env.local` locally and in Vercel → Project → Settings → Environment Variables. Never commit them.

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Supabase Postgres connection string: the **transaction pooler** (port 6543) |
| `AUTH_SECRET` | Random secret for signing sessions. Generate with `npx auth secret` |
| `AUTH_RESEND_KEY` | Resend API key, used to send login emails |
| `EMAIL_FROM` | Sender, e.g. `AIPE Labs <login@yourdomain.com>`. The domain must be verified in Resend |

## Database

Tables are defined in [src/db/schema.ts](src/db/schema.ts). Migrations live in `drizzle/`.

- `users`, `accounts`, `sessions`, `verification_tokens`: used by Auth.js
- `enrollments`: one row per user per cohort, `status` is `pending` or `paid`. A `paid` row is what unlocks `/learn`
- `lesson_progress`: one row per completed lesson

After changing the schema: `npm run db:generate`, review the SQL, then `npm run db:migrate`.

Row-level security is on for every table with no policies, so Supabase's public REST API can't read them. The app connects as the database owner and isn't affected.

### Give someone access by hand (until payments ship in #3)

```sql
insert into enrollments (user_id, cohort, status)
select id, 'cohort-1', 'paid' from users where email = 'member@example.com'
on conflict (user_id, cohort) do update set status = 'paid';
```

The user has to log in once first, so their `users` row exists.

## Lessons

Lessons are files in `content/<course>/<day>-<slug>.mdx`. Course slugs: `claude-code`, `codex`, `marketing`, `scalable-engineering`.

```mdx
---
title: Setup, CLAUDE.md, and context that sticks
order: 1          # position within the day
type: text        # or "video"
videoId: abc123   # required when type is video
---

Lesson body…
```
