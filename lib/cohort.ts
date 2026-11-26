// Cohort 1 facts in one place. The landing page, apply form, pay page and emails read from here.

export const COHORT = {
  id: "cohort-1",
  name: "Cohort 1",
  seatCap: 20,
  pricePaise: 2999_00,
  priceLabel: "₹2,999",
  nextCohortPriceLabel: "₹7,999",
  /** Hours an accepted applicant has to pay before the seat is released. */
  paymentWindowHours: 72,

  // TODO(#1): replace with confirmed dates. Leave null until decided; pages fall back to startLabel.
  startLabel: "Jan 2027",
  /** Day 1 kickoff, ISO with IST offset, e.g. "2027-01-11T19:00:00+05:30" */
  day1: null as string | null,
  day4: null as string | null,
  day7: null as string | null,
  /** Last moment to apply, ISO with IST offset. */
  applicationDeadline: null as string | null,

  refundPolicy: "Full refund any time before Day 1. Once the cohort starts, no refunds.",
};

const IST: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata" };

export function formatDate(iso: string, withTime = false): string {
  return new Date(iso).toLocaleString("en-IN", {
    ...IST,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }) + (withTime ? " IST" : "");
}

export function startLabel(): string {
  return COHORT.day1 ? formatDate(COHORT.day1) : COHORT.startLabel;
}

export function deadlineLabel(): string | null {
  return COHORT.applicationDeadline ? formatDate(COHORT.applicationDeadline, true) : null;
}

export function applicationsClosed(now = new Date()): boolean {
  return !!COHORT.applicationDeadline && now > new Date(COHORT.applicationDeadline);
}
