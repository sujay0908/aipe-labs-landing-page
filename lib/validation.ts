import { z } from "zod";

/** Strips spaces, dashes and brackets; adds +91 to a bare 10-digit Indian mobile number. */
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-().]/g, "");
  if (/^0?[6-9]\d{9}$/.test(p)) p = "+91" + p.replace(/^0/, "");
  if (/^91[6-9]\d{9}$/.test(p)) p = "+" + p;
  return p;
}

export const applicationSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100, "Keep it under 100 characters."),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((p) => /^\+\d{8,15}$/.test(p), "Enter a phone number with country code, e.g. +91 98765 43210.")
    .refine((p) => !p.startsWith("+91") || /^\+91[6-9]\d{9}$/.test(p), "Indian mobile numbers have 10 digits after +91."),
  building: z
    .string()
    .trim()
    .min(10, "Tell us in a line or two what you'll build.")
    .max(500, "Keep it to 1–2 lines (500 characters)."),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type FieldErrors = Partial<Record<keyof ApplicationInput, string>>;

export function validateApplication(data: Record<string, unknown>):
  | { ok: true; value: ApplicationInput }
  | { ok: false; errors: FieldErrors } {
  const r = applicationSchema.safeParse(data);
  if (r.success) return { ok: true, value: r.data };
  const errors: FieldErrors = {};
  for (const issue of r.error.issues) {
    const key = issue.path[0] as keyof ApplicationInput;
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}
