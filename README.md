# AIPE Labs

Landing page, application flow, payments and LMS for AIPE Labs Cohort 1. Next.js on Vercel, Postgres.

| Path | What |
|---|---|
| `/` | Landing page. Hand-written HTML in `landing/index.html`; `{{START}}` / `{{DEADLINE_NOTE}}` are filled from `lib/cohort.ts` |
| `/apply` | Application form → `applications` table. Waitlist once 20 seats are paid or the deadline passes |
| `/admin/applications` | Team only. Accept / reject, seat counts, 36h-overdue highlight, per-application log |
| `/admin/progress` | Team only. Lessons completed per member per course |
| `/pay/<token>` | Accepted applicant pays ₹2,999 with Razorpay Checkout |
| `/login` | Email magic link (paid members and team only) |
| `/learn` | LMS. Paid members only; team can preview |

## Run locally

```bash
npm install
cp .env.example .env.local          # fill in DATABASE_URL and ADMIN_EMAILS at minimum
npm run db:migrate                  # reads DATABASE_URL from the environment
npm run dev
```

Without `RESEND_API_KEY`, emails (login links, payment links) are printed to the server log, so you can click through the whole flow locally.

`npm test` runs unit tests (validation, Razorpay signatures, video signing). `npm run typecheck` runs tsc.

## Environment variables

All listed in `.env.example`. Set them in Vercel → Project → Settings → Environment Variables. None are committed.

| Var | Needed for |
|---|---|
| `APP_URL` | Links in emails. `https://aipe-labs.vercel.app` in production |
| `DATABASE_URL` | Everything except the landing page. Use the pooled connection string |
| `ADMIN_EMAILS` | Comma-separated team emails: `/admin` access and new-application alerts |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sending email. `EMAIL_FROM` must be on a domain verified in Resend |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Creating orders and verifying Checkout signatures |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook at `<APP_URL>/api/razorpay/webhook`, events `payment.captured` and `order.paid` |
| `BUNNY_LIBRARY_ID`, `BUNNY_TOKEN_KEY` | Signed video embeds. Turn on token authentication in the Bunny Stream library |
| `SLACK_INVITE_URL` | Sent in the welcome email after payment |

## Database

SQL migrations live in `db/migrations/` and run in order with `npm run db:migrate` (tracked in `schema_migrations`). Never edit an applied migration; add a new file.

Useful queries:

```sql
-- Seats
select status, count(*) from applications where cohort = 'cohort-1' group by status;

-- Everything that happened to one applicant
select e.created_at, e.action, e.actor, e.detail
from application_events e join applications a on a.id = e.application_id
where a.email = 'someone@example.com' order by e.created_at;
```

## Writing lessons

One file per lesson: `content/<course>/<day>-<slug>.mdx`. The day comes from the file name.

```mdx
---
title: "Hooks"
order: 1            # position within the day (default 1)
type: text          # or video
videoId: ""         # Bunny Stream video GUID, or "youtube:<id>" (unlisted, not protected)
duration: "20 min"
---

Lesson text in Markdown. Code blocks get highlighting and a copy button.

<BuildTask>What to build today.</BuildTask>

<DoneWhen>
- Checkable outcome
</DoneWhen>
```

Also available: `<Note>` and `<Warning>`. Course titles and day-7 outcomes are in `content/<course>/course.json`.

## How the flow works

1. **Apply.** Same email again updates the existing application.
2. **Accept** (admin). Sets a 72h payment window and emails a `/pay/<token>` link. Blocked when paid + held seats reach 20. Unpaid acceptances expire on the next page load after the deadline and free the seat.
3. **Pay.** The server creates a Razorpay order. Access is granted only after the Checkout signature verifies or the webhook arrives; both paths call the same idempotent fulfilment, under a lock, so no double enrolment and no 21st seat. The payer is logged in on the spot and gets a welcome email with a 7-day login link.
4. **Learn.** `/learn/*` checks for a paid enrollment on every request.

## Social card

`public/og.png` is a screenshot of `scripts/og.html` at 1200×630. When the start date changes, replace `__START__`, screenshot it again, and commit the PNG.
