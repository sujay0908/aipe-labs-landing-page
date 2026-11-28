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
npm run local:start          # checks setup, starts the server in the background
npm run local:stop
```

Next.js serves both the frontend (pages) and the backend (auth routes, server actions) from one process, so one server covers both. The database is the hosted Supabase project; its tables already exist (run `npm run db:migrate` only after a schema change).

[scripts/local.mjs](scripts/local.mjs) works the same in PowerShell, Git Bash and macOS:

| Command | What it does |
|---|---|
| `npm run local:start` | Checks `node_modules`, `.env.local` and the database connection, then starts the server and waits until it answers |
| `npm run local:stop` | Stops the server and everything it started |
| `npm run local:status` | Shows whether it's running |
| `npm run local -- restart` | Stop, then start |
| `npm run local -- logs` | Last 50 lines of the server log (`.local/server.log`) |

Options: `--port 4000` to use another port (pass it to every command), and `--no-db-check` to start without a database (pages that need login won't work).

For live logs in the terminal, use `npm run dev` instead.

## Environment variables

Set these in `.env.local` locally and in Vercel → Project → Settings → Environment Variables. Never commit them.

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Supabase project `aipe-labs` (ref `uuntgccqhnpevizfynez`, Mumbai): Connect → **Transaction pooler** string (port 6543) |
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
