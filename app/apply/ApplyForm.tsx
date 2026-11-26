"use client";

import { useActionState } from "react";
import { apply, type ApplyState } from "./actions";

export function ApplyForm({ submitLabel }: { submitLabel: string }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(apply, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};

  return (
    <form action={action} className="stack" noValidate>
      {state.formError && <div className="notice err">{state.formError}</div>}

      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" autoComplete="name" required defaultValue={v.name}
          aria-invalid={!!e.name} aria-describedby={e.name ? "name-error" : undefined} />
        {e.name && <span className="error" id="name-error">{e.name}</span>}
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={v.email}
          aria-invalid={!!e.email} aria-describedby={e.email ? "email-error" : "email-hint"} />
        {e.email ? <span className="error" id="email-error">{e.email}</span>
          : <span className="hint" id="email-hint">This becomes your course login.</span>}
      </div>

      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required
          defaultValue={v.phone ?? "+91 "} aria-invalid={!!e.phone}
          aria-describedby={e.phone ? "phone-error" : "phone-hint"} />
        {e.phone ? <span className="error" id="phone-error">{e.phone}</span>
          : <span className="hint" id="phone-hint">Outside India? Replace +91 with your country code.</span>}
      </div>

      <div className="field">
        <label htmlFor="building">What will you build in the 7 days?</label>
        <textarea id="building" name="building" required maxLength={500} defaultValue={v.building}
          placeholder="e.g. A WhatsApp bot that answers questions from my clinic's FAQ, live for 10 patients."
          aria-invalid={!!e.building} aria-describedby={e.building ? "building-error" : "building-hint"} />
        {e.building ? <span className="error" id="building-error">{e.building}</span>
          : <span className="hint" id="building-hint">1–2 lines. Small and specific beats big and vague.</span>}
      </div>

      {/* Honeypot for bots */}
      <div aria-hidden style={{ position: "absolute", left: "-9999px" }}>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button className="btn" type="submit" disabled={pending}>{pending ? "Sending…" : submitLabel}</button>
    </form>
  );
}
