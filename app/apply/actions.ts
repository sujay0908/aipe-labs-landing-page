"use server";

import { redirect } from "next/navigation";
import { submitApplication } from "@/lib/applications";
import { validateApplication, type FieldErrors } from "@/lib/validation";

export type ApplyState = { errors?: FieldErrors; values?: Record<string, string>; formError?: string };

export async function apply(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const values = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    building: String(form.get("building") ?? ""),
  };
  // Honeypot: real people never see or fill this field.
  if (String(form.get("website") ?? "") !== "") redirect("/apply/thanks");

  const result = validateApplication(values);
  if (!result.ok) return { errors: result.errors, values };

  let status: string;
  try {
    ({ status } = await submitApplication(result.value));
  } catch (err) {
    console.error("apply failed", err);
    return { values, formError: "Something went wrong saving your application. Try again in a minute." };
  }
  redirect(status === "waitlist" ? "/apply/thanks?waitlist=1" : "/apply/thanks");
}
