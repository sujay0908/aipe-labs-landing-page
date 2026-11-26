import { redirect } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { consumeLoginToken } from "@/lib/auth";

export const metadata = { title: "Log in" };

// The link opens this page and the person clicks a button. Consuming the token on GET would
// let email scanners (Outlook Safe Links, Gmail previews) burn the link before the person clicks.
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string; next?: string }> }) {
  const { token, next } = await searchParams;
  const safe = next?.startsWith("/") && !next.startsWith("//") ? next : "/learn";

  async function logIn() {
    "use server";
    if (!token || !(await consumeLoginToken(token))) redirect("/login?error=expired");
    redirect(safe);
  }

  return (
    <>
      <Topbar />
      <main className="narrow stack">
        <h1>Log in to AIPE Labs</h1>
        <form action={logIn}>
          <button className="btn" type="submit">Continue to your courses</button>
        </form>
      </main>
    </>
  );
}
