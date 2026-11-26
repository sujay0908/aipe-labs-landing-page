import "server-only";

export type Email = { to: string | string[]; subject: string; text: string };

/**
 * Sends through Resend's HTTP API. Without RESEND_API_KEY (local dev), prints the email
 * to the server log so magic links and payment links can be copied from there.
 */
export async function sendEmail(email: Email): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const to = Array.isArray(email.to) ? email.to : [email.to];
  if (!key) {
    console.log(`\n--- email (RESEND_API_KEY not set) ---\nTo: ${to.join(", ")}\nSubject: ${email.subject}\n\n${email.text}\n---\n`);
    return { ok: true, id: "logged" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "AIPE Labs <onboarding@resend.dev>",
        to,
        subject: email.subject,
        text: email.text,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: body.message ?? `HTTP ${res.status}` };
    return { ok: true, id: body.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
