"use client";

import { useState } from "react";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open(): void; on(event: string, cb: (r: { error?: { description?: string } }) => void): void };
declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Razorpay. Check your connection and try again."));
    document.body.appendChild(s);
  });
}

export function PayButton({ token, label, description }: { token: string; label: string; description: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      await loadCheckout();
      const res = await fetch("/api/pay/order", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error ?? "Couldn't start the payment.");

      const rzp = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "AIPE Labs",
        description,
        prefill: order.prefill,
        theme: { color: "#6d5aff" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (r: RazorpayResponse) => {
          const v = await fetch("/api/pay/verify", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...r }),
          });
          const out = await v.json().catch(() => ({}));
          if (v.ok && out.ok) window.location.reload();
          else { setError(out.error ?? "We couldn't confirm the payment. If you were charged, we'll email you."); setBusy(false); }
        },
      });
      rzp.on("payment.failed", (r) => {
        setError(`Payment failed: ${r.error?.description ?? "try again"}. You haven't been charged. You can retry with the same link.`);
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      <button className="btn" onClick={pay} disabled={busy}>{busy ? "Opening payment…" : label}</button>
      {error && <div className="notice err" role="alert">{error}</div>}
    </div>
  );
}
