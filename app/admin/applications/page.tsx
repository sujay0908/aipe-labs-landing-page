import Link from "next/link";
import { expireStale, listApplications, seatCounts, type Status } from "@/lib/applications";
import { COHORT, formatDate } from "@/lib/cohort";
import { decide } from "../actions";

export const dynamic = "force-dynamic";

const TABS: { key: string; label: string; match: (s: Status) => boolean }[] = [
  { key: "todo", label: "To review", match: (s) => s === "submitted" },
  { key: "accepted", label: "Awaiting payment", match: (s) => s === "accepted" },
  { key: "paid", label: "Paid", match: (s) => s === "paid" },
  { key: "waitlist", label: "Waitlist", match: (s) => s === "waitlist" },
  { key: "closed", label: "Rejected / expired", match: (s) => s === "rejected" || s === "expired" },
  { key: "problem", label: "Refund needed", match: (s) => s === "refund_needed" },
  { key: "all", label: "All", match: () => true },
];

const OVERDUE_HOURS = 36;
const DONE_TEXT: Record<string, string> = {
  accept: "Accepted. Payment email sent.",
  reject: "Rejected. Email sent.",
  resend: "Payment email sent again.",
};

function ago(d: Date): string {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 36e5);
  return h < 1 ? "just now" : h < 48 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export default async function ApplicationsPage({
  searchParams,
}: { searchParams: Promise<{ status?: string; error?: string; done?: string }> }) {
  const { status = "todo", error, done } = await searchParams;
  await expireStale();
  const [apps, seats] = await Promise.all([listApplications(), seatCounts()]);
  const tab = TABS.find((t) => t.key === status) ?? TABS[0];
  const rows = apps.filter((a) => tab.match(a.status));
  const overdue = apps.filter((a) => a.status === "submitted" && Date.now() - new Date(a.created_at).getTime() > OVERDUE_HOURS * 36e5).length;
  const full = seats.taken >= COHORT.seatCap;

  return (
    <main className="page">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ marginBottom: 0 }}>Applications</h1>
        <Link href="/admin/progress" className="small">Member progress →</Link>
      </div>

      <div className="stats">
        <div className="stat"><strong>{seats.paid} / {seats.cap}</strong><span>seats paid</span></div>
        <div className="stat"><strong>{seats.accepted}</strong><span>accepted, awaiting payment</span></div>
        <div className="stat"><strong>{seats.left}</strong><span>seats left to offer</span></div>
        <div className="stat"><strong style={{ color: overdue ? "var(--amber)" : undefined }}>{overdue}</strong><span>waiting over {OVERDUE_HOURS}h</span></div>
      </div>

      {error && <div className="notice err" style={{ marginBottom: 16 }}>{error}</div>}
      {done && DONE_TEXT[done] && <div className="notice ok" style={{ marginBottom: 16 }}>{DONE_TEXT[done]}</div>}
      {full && <div className="notice warn" style={{ marginBottom: 16 }}>Every seat is paid or held. Accepting more is blocked until someone&apos;s payment window expires.</div>}

      <nav className="tabs">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/applications?status=${t.key}`} aria-current={t.key === tab.key ? "page" : undefined}>
            {t.label} ({apps.filter((a) => t.match(a.status)).length})
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="muted">Nothing here.</p>
      ) : (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr><th>Applicant</th><th>Building</th><th>Submitted</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const late = a.status === "submitted" && Date.now() - new Date(a.created_at).getTime() > OVERDUE_HOURS * 36e5;
                return (
                  <tr key={a.id} className={late ? "overdue" : undefined}>
                    <td>
                      <strong>{a.name}</strong>
                      <div className="small"><a href={`mailto:${a.email}`}>{a.email}</a></div>
                      <div className="small dim"><a href={`tel:${a.phone}`} style={{ color: "inherit" }}>{a.phone}</a></div>
                    </td>
                    <td className="build">{a.building}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {formatDate(new Date(a.created_at).toISOString())}
                      <div className="small dim">{ago(a.created_at)}</div>
                      {late && <div className="overdue-tag">Decide now: 48h promise</div>}
                    </td>
                    <td>
                      <span className={`pill ${a.status}`}>{a.status.replace("_", " ")}</span>
                      {a.status === "accepted" && a.pay_deadline && (
                        <div className="small dim">pay by {formatDate(new Date(a.pay_deadline).toISOString(), true)}</div>
                      )}
                      {a.razorpay_payment_id && <div className="small dim">{a.razorpay_payment_id}</div>}
                      <details className="log">
                        <summary>log ({a.events.length})</summary>
                        {a.events.map((e, i) => (
                          <div key={i}>{new Date(e.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {e.action} · {e.actor}</div>
                        ))}
                      </details>
                    </td>
                    <td>
                      <form action={decide} className="actions">
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="tab" value={tab.key} />
                        {["submitted", "waitlist", "rejected", "expired"].includes(a.status) && (
                          <button className="btn sm" name="action" value="accept" disabled={full}>Accept</button>
                        )}
                        {["submitted", "waitlist", "accepted", "expired"].includes(a.status) && (
                          <button className="btn sm danger" name="action" value="reject">Reject</button>
                        )}
                        {a.status === "accepted" && (
                          <button className="btn sm ghost" name="action" value="resend">Resend link</button>
                        )}
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
