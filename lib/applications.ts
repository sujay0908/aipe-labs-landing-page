import "server-only";
import type postgres from "postgres";
import { createLoginLink, normalizeEmail } from "./auth";
import { COHORT } from "./cohort";
import { db } from "./db";
import { sendEmail, type Email } from "./email";
import * as emails from "./emails";
import { adminEmails, appUrl } from "./env";
import { newToken } from "./tokens";

export type Status = "submitted" | "waitlist" | "accepted" | "rejected" | "expired" | "paid" | "refund_needed";

export type Application = {
  id: string;
  name: string;
  email: string;
  phone: string;
  building: string;
  status: Status;
  decided_at: Date | null;
  decided_by: string | null;
  pay_token: string | null;
  pay_deadline: Date | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type Tx = postgres.TransactionSql | postgres.Sql;

async function log(tx: Tx, applicationId: string, action: string, actor: string, detail?: Record<string, unknown>) {
  await tx`
    insert into application_events (application_id, action, actor, detail)
    values (${applicationId}, ${action}, ${actor}, ${detail ? tx.json(detail as postgres.JSONValue) : null})`;
}

/** Sends an email and records the result in the application's log. */
async function sendLogged(applicationId: string, kind: string, email: Email) {
  const result = await sendEmail(email);
  await log(db(), applicationId, result.ok ? `email_sent:${kind}` : `email_failed:${kind}`, "system", {
    to: email.to,
    ...(result.error ? { error: result.error } : { id: result.id }),
  });
  return result;
}

/** Serialises seat-changing writes for the cohort (accept, pay). Call inside a transaction. */
async function lockCohort(tx: Tx) {
  await tx`select pg_advisory_xact_lock(hashtext(${"seats:" + COHORT.id}))`;
}

/** Accepted applicants past their payment deadline lose the seat. Run before reading seat counts. */
export async function expireStale(): Promise<number> {
  const rows = await db()`
    update applications set status = 'expired', updated_at = now()
    where cohort = ${COHORT.id} and status = 'accepted' and pay_deadline < now()
    returning id`;
  for (const r of rows) await log(db(), r.id, "expired", "system");
  return rows.length;
}

export type Seats = { paid: number; accepted: number; taken: number; cap: number; left: number };

export async function seatCounts(tx: Tx = db()): Promise<Seats> {
  const [r] = await tx`
    select count(*) filter (where status = 'paid')::int as paid,
           count(*) filter (where status = 'accepted' and pay_deadline > now())::int as accepted
    from applications where cohort = ${COHORT.id}`;
  const taken = r.paid + r.accepted;
  return { paid: r.paid, accepted: r.accepted, taken, cap: COHORT.seatCap, left: Math.max(0, COHORT.seatCap - taken) };
}

export async function cohortFull(): Promise<boolean> {
  return (await seatCounts()).paid >= COHORT.seatCap;
}

// ---------- Apply (#2) ----------

export async function submitApplication(input: {
  name: string;
  email: string;
  phone: string;
  building: string;
}): Promise<{ id: string; status: Status; created: boolean }> {
  const email = normalizeEmail(input.email);
  const status: Status = (await cohortFull()) ? "waitlist" : "submitted";

  // Same email again: update the details, keep whatever status the application already has.
  const [row] = await db()`
    insert into applications (cohort, name, email, phone, building, status)
    values (${COHORT.id}, ${input.name}, ${email}, ${input.phone}, ${input.building}, ${status})
    on conflict (cohort, email) do update
      set name = excluded.name, phone = excluded.phone, building = excluded.building, updated_at = now()
    returning id, status, (xmax = 0) as created`;

  await log(db(), row.id, row.created ? "applied" : "application_updated", "applicant");

  if (row.created) {
    const a = { ...input, email, status: row.status };
    await sendLogged(row.id, "received", row.status === "waitlist" ? emails.waitlistReceived(a) : emails.applicationReceived(a));
    const team = adminEmails();
    if (team.length) await sendLogged(row.id, "team_alert", emails.newApplicationAlert(team, a, `${appUrl()}/admin/applications`));
  }
  return { id: row.id, status: row.status, created: row.created };
}

// ---------- Review (#23) ----------

export async function listApplications(): Promise<(Application & { events: { action: string; actor: string; created_at: Date }[] })[]> {
  return (await db()`
    select a.*,
      coalesce((select json_agg(json_build_object('action', e.action, 'actor', e.actor, 'created_at', e.created_at) order by e.created_at desc)
                from application_events e where e.application_id = a.id), '[]') as events
    from applications a where a.cohort = ${COHORT.id}
    order by case a.status when 'submitted' then 0 when 'accepted' then 1 when 'refund_needed' then 2 else 3 end, a.created_at asc`) as never;
}

export type DecisionResult = { ok: true } | { ok: false; error: string };

export async function acceptApplication(id: string, actor: string): Promise<DecisionResult> {
  await expireStale();
  const token = newToken(24);
  const result = await db().begin(async (tx) => {
    await lockCohort(tx);
    const seats = await seatCounts(tx);
    if (seats.taken >= COHORT.seatCap) return { ok: false as const, error: `All ${COHORT.seatCap} seats are paid or held by accepted applicants.` };
    const rows = await tx`
      update applications
      set status = 'accepted', decided_at = now(), decided_by = ${actor}, updated_at = now(),
          pay_token = coalesce(pay_token, ${token}),
          pay_deadline = now() + ${`${COHORT.paymentWindowHours} hours`}::interval
      where id = ${id} and cohort = ${COHORT.id} and status in ('submitted', 'waitlist', 'rejected', 'expired')
      returning *`;
    if (rows.length === 0) return { ok: false as const, error: "This application can't be accepted from its current status." };
    await log(tx, id, "accepted", actor, { deadline: rows[0].pay_deadline });
    return { ok: true as const, app: rows[0] as Application };
  });
  if (!result.ok) return result;
  await sendPaymentEmail(result.app);
  return { ok: true };
}

export async function sendPaymentEmail(app: Application) {
  return sendLogged(app.id, "payment_link", emails.accepted(app, `${appUrl()}/pay/${app.pay_token}`, new Date(app.pay_deadline!)));
}

export async function resendPaymentEmail(id: string, actor: string): Promise<DecisionResult> {
  const [app] = (await db()`select * from applications where id = ${id} and status = 'accepted' and pay_deadline > now()`) as unknown as Application[];
  if (!app) return { ok: false, error: "Only accepted applications inside their payment window can be re-sent." };
  await log(db(), id, "payment_link_resent", actor);
  await sendPaymentEmail(app);
  return { ok: true };
}

export async function rejectApplication(id: string, actor: string): Promise<DecisionResult> {
  const rows = (await db()`
    update applications set status = 'rejected', decided_at = now(), decided_by = ${actor}, updated_at = now()
    where id = ${id} and cohort = ${COHORT.id} and status in ('submitted', 'waitlist', 'accepted', 'expired')
    returning *`) as unknown as Application[];
  if (rows.length === 0) return { ok: false, error: "This application can't be rejected from its current status." };
  await log(db(), id, "rejected", actor);
  await sendLogged(id, "rejection", emails.rejected(rows[0]));
  return { ok: true };
}

// ---------- Pay (#3) ----------

export async function applicationByPayToken(token: string): Promise<Application | null> {
  await expireStale();
  const [row] = await db()`select * from applications where pay_token = ${token}`;
  return (row as Application) ?? null;
}

/** Why this pay link can't take a payment right now, or null if it can. */
export function payBlocker(app: Application | null): string | null {
  if (!app) return "This payment link isn't valid. Check you copied the whole link from the email.";
  switch (app.status) {
    case "accepted":
      return null;
    case "paid":
      return "paid";
    case "expired":
      return "This payment link has expired and the seat was released. Reply to the acceptance email if you still want in.";
    default:
      return "This payment link is no longer active. Reply to your email from AIPE Labs if you think that's a mistake.";
  }
}

/**
 * Grants the seat after a verified payment. Called from both the Checkout success handler and the
 * Razorpay webhook, so it must be idempotent: only the first call for an order does anything.
 */
export async function fulfillPayment(input: {
  orderId: string;
  paymentId: string;
  source: "checkout" | "webhook";
}): Promise<{ status: "granted" | "already_paid" | "refund_needed" | "unknown_order"; email?: string }> {
  const outcome = await db().begin(async (tx) => {
    await lockCohort(tx);
    const [app] = (await tx`select * from applications where razorpay_order_id = ${input.orderId} for update`) as unknown as Application[];
    if (!app) return { status: "unknown_order" as const };
    if (app.status === "paid" || app.status === "refund_needed") return { status: "already_paid" as const, email: app.email };

    const { paid } = await seatCounts(tx);
    if (paid >= COHORT.seatCap) {
      // Can only happen if someone pays after their seat was released and re-filled.
      await tx`update applications set status = 'refund_needed', razorpay_payment_id = ${input.paymentId}, paid_at = now(), updated_at = now() where id = ${app.id}`;
      await log(tx, app.id, "paid_over_cap", input.source, { paymentId: input.paymentId });
      return { status: "refund_needed" as const, email: app.email };
    }

    await tx`
      update applications set status = 'paid', razorpay_payment_id = ${input.paymentId}, paid_at = now(), updated_at = now()
      where id = ${app.id}`;
    const [user] = await tx`
      insert into users (name, email, phone) values (${app.name}, ${app.email}, ${app.phone})
      on conflict (email) do update set name = excluded.name, phone = excluded.phone
      returning id`;
    await tx`
      insert into enrollments (user_id, cohort, status, payment_id) values (${user.id}, ${COHORT.id}, 'paid', ${input.paymentId})
      on conflict (user_id, cohort) do update set status = 'paid', payment_id = excluded.payment_id`;
    await log(tx, app.id, "paid", input.source, { orderId: input.orderId, paymentId: input.paymentId });
    return { status: "granted" as const, email: app.email, app };
  });

  if (outcome.status === "granted" && "app" in outcome && outcome.app) {
    const loginUrl = await createLoginLink(outcome.app.email, "/learn", 7 * 24 * 60);
    await sendLogged(outcome.app.id, "welcome", emails.welcome(outcome.app, loginUrl, process.env.SLACK_INVITE_URL));
  }
  return { status: outcome.status, email: outcome.email };
}

export async function attachOrder(appId: string, orderId: string) {
  await db()`update applications set razorpay_order_id = ${orderId}, updated_at = now() where id = ${appId}`;
  await log(db(), appId, "order_created", "applicant", { orderId });
}

// ---------- Progress report for the team (#22) ----------

export async function memberProgress(): Promise<{ name: string; email: string; lessons: string[] }[]> {
  return (await db()`
    select u.name, u.email, coalesce(array_agg(p.lesson_slug) filter (where p.lesson_slug is not null), '{}') as lessons
    from users u
    join enrollments e on e.user_id = u.id and e.cohort = ${COHORT.id} and e.status = 'paid'
    left join lesson_progress p on p.user_id = u.id
    group by u.id order by u.name`) as never;
}
