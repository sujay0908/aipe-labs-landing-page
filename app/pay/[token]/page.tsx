import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { applicationByPayToken, payBlocker } from "@/lib/applications";
import { COHORT, formatDate, startLabel } from "@/lib/cohort";
import { PayButton } from "./PayButton";

export const metadata = { title: "Confirm your seat", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const app = await applicationByPayToken(token);
  const blocker = payBlocker(app);

  return (
    <>
      <Topbar />
      <main className="narrow stack">
        <div className="label">AIPE Labs · {COHORT.name}</div>
        {blocker === "paid" ? (
          <>
            <h1>You&apos;re in, {app!.name.split(" ")[0]}.</h1>
            <p className="muted">Payment received. All four courses are unlocked. We emailed your receipt details, login link and Slack invite.</p>
            <Link className="btn" href="/learn">Go to your courses</Link>
          </>
        ) : blocker ? (
          <>
            <h1>Can&apos;t take payment on this link</h1>
            <div className="notice warn">{blocker}</div>
          </>
        ) : (
          <>
            <h1>Confirm your seat, {app!.name.split(" ")[0]}</h1>
            <div className="card stack" style={{ gap: 10 }}>
              <Row k="Cohort" v={`${COHORT.name}, starts ${startLabel()}`} />
              {COHORT.day7 && <Row k="Demo day" v={formatDate(COHORT.day7)} />}
              <Row k="Includes" v="7-day live cohort, Slack, team review, and all four 7-day courses" />
              <Row k="Price" v={`${COHORT.priceLabel} (founding price)`} />
              <Row k="Pay by" v={formatDate(new Date(app!.pay_deadline!).toISOString(), true)} />
            </div>
            <PayButton token={token} label={`Pay ${COHORT.priceLabel}`} description={`${COHORT.name} seat`} />
            <p className="small dim">
              UPI, cards and netbanking via Razorpay. Refunds: {COHORT.refundPolicy} If the seat isn&apos;t paid by the
              deadline, it goes to the next applicant.
            </p>
          </>
        )}
      </main>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
      <span className="small dim">{k}</span>
      <span style={{ textAlign: "right" }}>{v}</span>
    </div>
  );
}
