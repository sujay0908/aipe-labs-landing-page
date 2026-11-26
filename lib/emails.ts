import "server-only";
import { COHORT, formatDate, startLabel } from "./cohort";
import type { Email } from "./email";

// Every email the apply → pay flow sends. Plain text on purpose: it lands in the inbox, not Promotions.

const SIGN_OFF = "Hitesh, Sujay and Ruthwik\nAIPE Labs";

export function applicationReceived(a: { name: string; email: string }): Email {
  return {
    to: a.email,
    subject: `We got your application for AIPE Labs ${COHORT.name}`,
    text: `Hi ${first(a.name)},

Thanks for applying to AIPE Labs ${COHORT.name}.

We review every application within 48 hours. If you're in, you'll get a payment link by email. Your seat is confirmed once you pay ${COHORT.priceLabel}.

${SIGN_OFF}`,
  };
}

export function waitlistReceived(a: { name: string; email: string }): Email {
  return {
    to: a.email,
    subject: `You're on the AIPE Labs waitlist`,
    text: `Hi ${first(a.name)},

${COHORT.name} is full, so you're on the waitlist. If a seat opens up, we'll email you first. Either way, you'll hear about the next cohort before anyone else.

${SIGN_OFF}`,
  };
}

export function newApplicationAlert(
  to: string[],
  a: { name: string; email: string; phone: string; building: string; status: string },
  adminUrl: string,
): Email {
  return {
    to,
    subject: `New ${a.status === "waitlist" ? "waitlist signup" : "application"}: ${a.name}`,
    text: `${a.name} <${a.email}> · ${a.phone}

Building: ${a.building}

Review: ${adminUrl}
Reply within 48 hours.`,
  };
}

export function accepted(a: { name: string; email: string }, payUrl: string, deadline: Date): Email {
  return {
    to: a.email,
    subject: `You're in: AIPE Labs ${COHORT.name}`,
    text: `Hi ${first(a.name)},

You're accepted into AIPE Labs ${COHORT.name}, starting ${startLabel()}.

Pay ${COHORT.priceLabel} to confirm your seat:
${payUrl}

The link is yours alone and holds your seat until ${formatDate(deadline.toISOString(), true)}. After that, the seat goes to the next applicant.

Refunds: ${COHORT.refundPolicy}

${SIGN_OFF}`,
  };
}

export function rejected(a: { name: string; email: string }): Email {
  return {
    to: a.email,
    subject: `Your AIPE Labs ${COHORT.name} application`,
    text: `Hi ${first(a.name)},

Thanks for applying. We can't offer you a seat in ${COHORT.name}. We had more applications than seats, and we picked the projects we think can ship in 7 days with what the cohort covers.

We'll email you when the next cohort opens. If you scope your project down to something you can demo in a week, apply again.

${SIGN_OFF}`,
  };
}

export function welcome(a: { name: string; email: string }, loginUrl: string, slackUrl: string | undefined): Email {
  return {
    to: a.email,
    subject: `Welcome to AIPE Labs ${COHORT.name}`,
    text: `Hi ${first(a.name)},

Payment received. Your seat in ${COHORT.name} is confirmed, starting ${startLabel()}.

1. Log in to your courses (link works once, valid for 7 days):
${loginUrl}
Later, log in any time at the same site with this email.

2. Join the cohort Slack:
${slackUrl ?? "We'll send your Slack invite before Day 1."}

3. Before Day 1, write one sentence: what will you demo on day 7?

Razorpay emails your payment receipt separately. Refunds: ${COHORT.refundPolicy}

${SIGN_OFF}`,
  };
}

function first(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}
