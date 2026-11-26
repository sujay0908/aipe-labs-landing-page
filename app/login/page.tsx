import Link from "next/link";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { sessionEmail } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safe = next?.startsWith("/") && !next.startsWith("//") ? next : "/learn";
  if (await sessionEmail()) redirect(safe);

  return (
    <>
      <Topbar />
      <main className="narrow stack">
        <div>
          <div className="label">Members</div>
          <h1>Log in to AIPE Labs</h1>
          <p className="muted">We&apos;ll email you a one-time link. No password.</p>
        </div>
        {error === "expired" && (
          <div className="notice err">That link has expired or was already used. Request a new one.</div>
        )}
        <LoginForm next={safe} />
        <p className="small dim">
          Not a member yet? <Link href="/apply">Apply for Cohort 1</Link>.
        </p>
      </main>
    </>
  );
}
