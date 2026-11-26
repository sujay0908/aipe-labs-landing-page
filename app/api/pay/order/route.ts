import { NextResponse } from "next/server";
import { applicationByPayToken, attachOrder, payBlocker, seatCounts } from "@/lib/applications";
import { COHORT } from "@/lib/cohort";
import { createOrder, razorpayKeyId } from "@/lib/razorpay";

// Creates (or reuses) the Razorpay order for an accepted application.
export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const app = token ? await applicationByPayToken(token) : null;
  const blocker = payBlocker(app);
  if (blocker || !app) return NextResponse.json({ error: blocker === "paid" ? "Already paid." : blocker }, { status: 400 });

  if ((await seatCounts()).paid >= COHORT.seatCap) {
    return NextResponse.json({ error: `${COHORT.name} is full. You haven't been charged.` }, { status: 409 });
  }

  const keyId = razorpayKeyId();
  if (!keyId) return NextResponse.json({ error: "Payments aren't switched on yet. We'll email you." }, { status: 503 });

  let orderId = app.razorpay_order_id;
  if (!orderId) {
    try {
      const order = await createOrder({
        amountPaise: COHORT.pricePaise,
        receipt: app.id.slice(0, 40),
        notes: { application_id: app.id, cohort: COHORT.id, email: app.email },
      });
      orderId = order.id;
      await attachOrder(app.id, orderId);
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "Couldn't start the payment. Try again in a minute." }, { status: 502 });
    }
  }

  return NextResponse.json({
    keyId,
    orderId,
    amount: COHORT.pricePaise,
    currency: "INR",
    prefill: { name: app.name, email: app.email, contact: app.phone },
  });
}
