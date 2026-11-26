// Run: npm test  (Node 22.18+ strips TypeScript types natively)
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyPaymentSignature, verifyWebhookSignature } from "../lib/razorpay.ts";
import { normalizePhone, validateApplication } from "../lib/validation.ts";
import { videoEmbedUrl } from "../lib/video.ts";

test("phone numbers normalise to E.164", () => {
  assert.equal(normalizePhone("98765 43210"), "+919876543210");
  assert.equal(normalizePhone("+91 98765-43210"), "+919876543210");
  assert.equal(normalizePhone("09876543210"), "+919876543210");
  assert.equal(normalizePhone("+1 (415) 555-0100"), "+14155550100");
});

test("application validation gives one message per bad field", () => {
  const bad = validateApplication({ name: "A", email: "nope", phone: "+91 12345", building: "app" });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.deepEqual(Object.keys(bad.errors).sort(), ["building", "email", "name", "phone"]);

  const good = validateApplication({ name: " Asha Rao ", email: "Asha@Example.com", phone: "9876543210", building: "A WhatsApp FAQ bot for my clinic" });
  assert.equal(good.ok, true);
  if (good.ok) {
    assert.equal(good.value.email, "asha@example.com");
    assert.equal(good.value.name, "Asha Rao");
    assert.equal(good.value.phone, "+919876543210");
  }
});

test("Razorpay checkout signature", () => {
  const sig = createHmac("sha256", "secret").update("order_1|pay_1").digest("hex");
  assert.equal(verifyPaymentSignature("order_1", "pay_1", sig, "secret"), true);
  assert.equal(verifyPaymentSignature("order_1", "pay_2", sig, "secret"), false);
  assert.equal(verifyPaymentSignature("order_1", "pay_1", "short", "secret"), false);
});

test("Razorpay webhook signature", () => {
  const body = JSON.stringify({ event: "payment.captured" });
  const sig = createHmac("sha256", "whsec").update(body).digest("hex");
  assert.equal(verifyWebhookSignature(body, sig, "whsec"), true);
  assert.equal(verifyWebhookSignature(body + " ", sig, "whsec"), false);
});

test("Bunny video URLs are signed and expire", () => {
  process.env.BUNNY_LIBRARY_ID = "123";
  process.env.BUNNY_TOKEN_KEY = "key";
  const now = 1_700_000_000_000;
  const url = new URL(videoEmbedUrl("vid-1", now)!);
  const expires = url.searchParams.get("expires")!;
  assert.equal(Number(expires), now / 1000 + 4 * 3600);
  assert.equal(url.searchParams.get("token"), createHash("sha256").update("key" + "vid-1" + expires).digest("hex"));
  assert.equal(videoEmbedUrl(""), null);
  assert.match(videoEmbedUrl("youtube:abc")!, /youtube-nocookie\.com\/embed\/abc/);
});
