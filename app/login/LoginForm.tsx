"use client";

import { useActionState } from "react";
import { sendLoginLink, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendLoginLink, {});

  if (state.sent) {
    return (
      <div className="notice ok">
        <strong>Check your email.</strong> If <b>{state.email}</b> has a seat in Cohort 1, a login link is on its
        way. It works once and expires in 20 minutes.
      </div>
    );
  }

  return (
    <form action={action} className="stack" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email" name="email" type="email" autoComplete="email" required
          defaultValue={state.email} aria-invalid={!!state.error} aria-describedby="email-error"
        />
        {state.error && <span className="error" id="email-error">{state.error}</span>}
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Email me a login link"}
      </button>
    </form>
  );
}
