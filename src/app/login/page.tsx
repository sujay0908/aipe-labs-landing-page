import { signIn } from "@/auth";

function safePath(p: string | undefined) {
  // Only same-site paths: "/learn" yes, "//evil.com" or "https://..." no.
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/learn";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const redirectTo = safePath((await searchParams).callbackUrl);

  async function sendLink(formData: FormData) {
    "use server";
    await signIn("resend", { email: String(formData.get("email") ?? ""), redirectTo });
  }

  return (
    <main>
      <h1>Log in to AIPE Labs</h1>
      <p>We&apos;ll email you a link to log in. No password needed.</p>
      <form action={sendLink}>
        <label>
          Email
          <br />
          <input type="email" name="email" required autoComplete="email" style={{ padding: 8, width: "100%", maxWidth: 360 }} />
        </label>
        <br />
        <button type="submit" style={{ marginTop: 12, padding: "8px 16px" }}>Email me a login link</button>
      </form>
    </main>
  );
}
