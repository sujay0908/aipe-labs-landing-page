"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { acceptApplication, rejectApplication, resendPaymentEmail } from "@/lib/applications";
import { requireAdmin } from "@/lib/auth";

export async function decide(form: FormData): Promise<void> {
  const actor = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const action = String(form.get("action") ?? "");
  const tab = String(form.get("tab") ?? "");

  const result =
    action === "accept" ? await acceptApplication(id, actor)
    : action === "reject" ? await rejectApplication(id, actor)
    : action === "resend" ? await resendPaymentEmail(id, actor)
    : { ok: false as const, error: "Unknown action." };

  revalidatePath("/admin/applications");
  const params = new URLSearchParams(tab ? { status: tab } : {});
  if (!result.ok) params.set("error", result.error);
  else params.set("done", action);
  redirect(`/admin/applications?${params}`);
}
