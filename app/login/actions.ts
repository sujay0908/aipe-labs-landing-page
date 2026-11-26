"use server";

import { z } from "zod";
import { requestMagicLink } from "@/lib/auth";

export type LoginState = { sent?: boolean; error?: string; email?: string };

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/learn";
}

export async function sendLoginLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim();
  if (!z.email().safeParse(email).success) return { error: "Enter a valid email address.", email };
  await requestMagicLink(email, safeNext(form.get("next")));
  return { sent: true, email };
}
