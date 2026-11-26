import { NextResponse } from "next/server";
import { fulfillPayment } from "@/lib/applications";
import { verifyWebhookSignature } from "@/lib/razorpay";

// Razorpay → Settings → Webhooks: URL <APP_URL>/api/razorpay/webhook, events payment.captured and order.paid,
// secret = RAZORPAY_WEBHOOK_SECRET. Backs up the Checkout handler if the browser closes mid-payment.
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; status: string } } };
  };
  const payment = event.payload?.payment?.entity;
  if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.order_id) {
    const result = await fulfillPayment({ orderId: payment.order_id, paymentId: payment.id, source: "webhook" });
    return NextResponse.json({ received: true, result: result.status });
  }
  return NextResponse.json({ received: true, ignored: event.event });
}
