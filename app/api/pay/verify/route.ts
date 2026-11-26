import { NextResponse } from "next/server";
import { applicationByPayToken, fulfillPayment } from "@/lib/applications";
import { startSession } from "@/lib/auth";
import { verifyPaymentSignature } from "@/lib/razorpay";

type Body = { token?: string; razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };

// Called by Checkout's success handler. Access is granted only if Razorpay's signature checks out.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Body;
  const app = b.token ? await applicationByPayToken(b.token) : null;
  if (!app || !b.razorpay_order_id || !b.razorpay_payment_id || !b.razorpay_signature) {
    return NextResponse.json({ ok: false, error: "Missing payment details." }, { status: 400 });
  }
  if (app.razorpay_order_id !== b.razorpay_order_id ||
      !verifyPaymentSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) {
    return NextResponse.json({ ok: false, error: "We couldn't verify this payment. If you were charged, we'll confirm it by email shortly." }, { status: 400 });
  }

  const result = await fulfillPayment({ orderId: b.razorpay_order_id, paymentId: b.razorpay_payment_id, source: "checkout" });
  if (result.status === "refund_needed") {
    return NextResponse.json({ ok: false, error: "The cohort filled up before your payment went through. We'll refund you in full within 5–7 working days." }, { status: 409 });
  }
  // The person just paid from the link we emailed them: log them straight in.
  await startSession(app.email);
  return NextResponse.json({ ok: true });
}
