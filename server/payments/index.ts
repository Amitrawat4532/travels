import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentMethod } from "@prisma/client";

/**
 * Payment abstraction.
 *
 * - `pay_to_driver` (default, MVP/dev): no money moves online. The seat is
 *   reserved and the booking is CONFIRMED; the Payment row stays PENDING until
 *   the driver marks the passenger as boarded & paid. Nothing is faked as paid.
 * - `razorpay`: creates a Razorpay order; the booking stays PENDING (seats
 *   held for PAYMENT_HOLD_MINUTES) until the webhook / client signature is
 *   verified. Enable with PAYMENT_PROVIDER=razorpay + keys (see README).
 */
export type CreatePaymentInput = {
  bookingId: string;
  bookingCode: string;
  amountPaise: number;
  customer: { name: string; email: string; phone: string };
};

export type CreatePaymentResult = {
  provider: string;
  method: PaymentMethod;
  /** true → booking can be confirmed immediately (seat reserved, pay later). */
  confirmsImmediately: boolean;
  providerOrderId?: string;
  raw?: Record<string, unknown>;
};

export interface PaymentProvider {
  id: string;
  label: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyClientSignature?(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhook?(rawBody: string, signature: string): boolean;
}

class PayToDriverProvider implements PaymentProvider {
  id = "pay_to_driver";
  label = "Pay driver at boarding (Cash / UPI)";
  async createPayment(): Promise<CreatePaymentResult> {
    return { provider: this.id, method: "PAY_TO_DRIVER", confirmsImmediately: true };
  }
}

class RazorpayProvider implements PaymentProvider {
  id = "razorpay";
  label = "Pay online (UPI / Card / Netbanking)";
  constructor(
    private keyId: string,
    private keySecret: string,
    private webhookSecret: string | undefined,
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: "INR",
        receipt: input.bookingCode,
        notes: { bookingId: input.bookingId },
      }),
    });
    if (!res.ok) throw new Error(`Razorpay order failed: ${res.status}`);
    const order = (await res.json()) as { id: string } & Record<string, unknown>;
    return {
      provider: this.id,
      method: "ONLINE",
      confirmsImmediately: false,
      providerOrderId: order.id,
      raw: order,
    };
  }

  verifyClientSignature(orderId: string, paymentId: string, signature: string): boolean {
    const expected = createHmac("sha256", this.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    return safeEqual(expected, signature);
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    return safeEqual(expected, signature);
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  const { PAYMENT_PROVIDER, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } = process.env;
  if (PAYMENT_PROVIDER === "razorpay" && RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    cached = new RazorpayProvider(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET);
  } else {
    cached = new PayToDriverProvider();
  }
  return cached;
}
