import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { COHORT } from "./cohort";
import { db } from "./db";
import { sendEmail } from "./email";
import { appUrl, isAdmin } from "./env";
import { hashToken, newToken } from "./tokens";

const SESSION_COOKIE = "aipe_session";
const SESSION_DAYS = 30;
const LINK_MINUTES = 20;

export type Member = { id: string; name: string; email: string; lastLesson: string | null };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Who may log in: paid members of this cohort, and the team. */
async function canLogIn(email: string): Promise<boolean> {
  if (isAdmin(email)) return true;
  const rows = await db()`
    select 1 from users u join enrollments e on e.user_id = u.id
    where u.email = ${email} and e.cohort = ${COHORT.id} and e.status = 'paid' limit 1`;
  return rows.length > 0;
}

/** Creates a one-time login token. Returns the URL; caller decides how to deliver it. */
export async function createLoginLink(rawEmail: string, next = "/learn", ttlMinutes = LINK_MINUTES): Promise<string> {
  const email = normalizeEmail(rawEmail);
  const token = newToken();
  await db()`
    insert into login_tokens (token_hash, email, expires_at)
    values (${hashToken(token)}, ${email}, now() + ${`${ttlMinutes} minutes`}::interval)`;
  const url = new URL("/auth/verify", appUrl());
  url.searchParams.set("token", token);
  if (next !== "/learn") url.searchParams.set("next", next);
  return url.toString();
}

/** Sends a magic link if the email is allowed in. Silent otherwise, so emails can't be probed. */
export async function requestMagicLink(rawEmail: string, next = "/learn"): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!(await canLogIn(email))) return;
  const link = await createLoginLink(email, next);
  await sendEmail({
    to: email,
    subject: "Your AIPE Labs login link",
    text: `Log in to AIPE Labs:\n\n${link}\n\nThe link works once and expires in ${LINK_MINUTES} minutes. If you didn't ask for it, ignore this email.`,
  });
}

/** Consumes a login token and starts a session. Returns false if the token is invalid or used. */
export async function consumeLoginToken(token: string): Promise<boolean> {
  const rows = await db()`
    update login_tokens set used_at = now()
    where token_hash = ${hashToken(token)} and used_at is null and expires_at > now()
    returning email`;
  if (rows.length === 0) return false;
  await startSession(rows[0].email as string);
  return true;
}

/** Logs the browser in as this email. Callers must have proven the person owns it. */
export async function startSession(email: string): Promise<void> {
  const session = newToken();
  await db()`
    insert into sessions (token_hash, email, expires_at)
    values (${hashToken(session)}, ${email}, now() + ${`${SESSION_DAYS} days`}::interval)`;
  (await cookies()).set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db()`delete from sessions where token_hash = ${hashToken(token)}`;
  jar.delete(SESSION_COOKIE);
}

/** Email of the logged-in person, or null. Cached per request. */
export const sessionEmail = cache(async (): Promise<string | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db()`
    select email from sessions where token_hash = ${hashToken(token)} and expires_at > now()`;
  return rows[0]?.email ?? null;
});

/**
 * Gate for /learn. Not logged in → /login. Logged in without a paid seat → /apply.
 * The team can preview the LMS without a seat.
 */
export const requireMember = cache(async (next = "/learn"): Promise<Member> => {
  const email = await sessionEmail();
  if (!email) redirect(`/login?next=${encodeURIComponent(next)}`);

  const rows = await db()`
    select u.id, u.name, u.email, u.last_lesson,
           exists (select 1 from enrollments e
                   where e.user_id = u.id and e.cohort = ${COHORT.id} and e.status = 'paid') as paid
    from users u where u.email = ${email}`;
  const user = rows[0];

  if (user?.paid) return { id: user.id, name: user.name, email: user.email, lastLesson: user.last_lesson };

  if (isAdmin(email)) {
    // Team preview: give the admin a user row so progress works, without an enrollment.
    const [row] = await db()`
      insert into users (name, email) values (${email.split("@")[0]}, ${email})
      on conflict (email) do update set email = excluded.email
      returning id, name, email, last_lesson`;
    return { id: row.id, name: row.name, email: row.email, lastLesson: row.last_lesson };
  }
  redirect("/apply?from=learn");
});

/** Gate for /admin. Anyone who isn't on the team gets a 404, logged in or not. */
export async function requireAdmin(): Promise<string> {
  const email = await sessionEmail();
  if (!email || !isAdmin(email)) notFound();
  return email;
}
