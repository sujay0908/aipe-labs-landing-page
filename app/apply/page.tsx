import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { cohortFull } from "@/lib/applications";
import { applicationsClosed, COHORT, deadlineLabel, startLabel } from "@/lib/cohort";
import { ApplyForm } from "./ApplyForm";

export const metadata = { title: `Apply for ${COHORT.name}` };
export const dynamic = "force-dynamic";

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const full = await cohortFull();
  const closed = applicationsClosed();
  const deadline = deadlineLabel();
  const waitlist = full || closed;

  return (
    <>
      <Topbar />
      <main className="narrow stack">
        {from === "learn" && (
          <div className="notice warn">
            Courses unlock once your seat is paid. Apply below, or <Link href="/login">log in</Link> with the email you paid with.
          </div>
        )}
        <div>
          <div className="label">AIPE Labs · {COHORT.name}</div>
          {waitlist ? (
            <>
              <h1>{full ? `${COHORT.name} is full` : `Applications for ${COHORT.name} are closed`}</h1>
              <p className="muted">Join the waitlist. If a seat opens, you hear first. You&apos;ll also get first access to the next cohort.</p>
            </>
          ) : (
            <>
              <h1>Apply for {COHORT.name}</h1>
              <p className="muted">
                Starts {startLabel()}. {COHORT.priceLabel} founding price, {COHORT.seatCap} seats.
                {deadline && <> Apply by <strong style={{ color: "var(--text)" }}>{deadline}</strong>.</>}
              </p>
            </>
          )}
        </div>

        {!waitlist && (
          <div className="notice">
            <strong>How it works.</strong> Application-based. We review applications within 48 hours. If you&apos;re
            accepted, you get a payment link for {COHORT.priceLabel}. Once you pay, all four courses unlock.
          </div>
        )}

        <ApplyForm submitLabel={waitlist ? "Join the waitlist" : "Send application"} />
      </main>
    </>
  );
}
