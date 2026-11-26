import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { COHORT } from "@/lib/cohort";

export const metadata = { title: "Application received" };

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ waitlist?: string }> }) {
  const { waitlist } = await searchParams;
  return (
    <>
      <Topbar />
      <main className="narrow stack">
        <div className="label">AIPE Labs · {COHORT.name}</div>
        {waitlist ? (
          <>
            <h1>You&apos;re on the waitlist</h1>
            <p className="muted">If a seat opens up, we&apos;ll email you first. We sent a confirmation to your inbox.</p>
          </>
        ) : (
          <>
            <h1>Application received</h1>
            <p className="muted">
              We review every application within 48 hours. If you&apos;re in, you&apos;ll get a payment link by email.
            </p>
            <p className="small dim">We sent a confirmation to your inbox. Not there? Check spam, then reply to us on X.</p>
          </>
        )}
        <p><Link href="/">← Back to AIPE Labs</Link></p>
      </main>
    </>
  );
}
