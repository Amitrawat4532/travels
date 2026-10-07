import { connection } from "next/server";
import { db } from "@/server/db";
import { getPaymentProvider } from "@/server/payments";
import { notifyAndDispatch } from "@/server/notifications";

/**
 * Payment gateway webhook (Razorpay format). Marks the payment PAID and the
 * booking CONFIRMED only after the signature is verified. Inactive unless
 * PAYMENT_PROVIDER=razorpay and RAZORPAY_WEBHOOK_SECRET are configured.
 */
type RazorpayEvent = {
  event: string;
  payload?: { payment?: { entity?: { id: string; order_id: string; status: string } } };
};

export async function POST(request: Request) {
  await connection();
  const provider = getPaymentProvider();
  if (!provider.verifyWebhook) return new Response("Payments webhook not enabled", { status: 404 });

  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!provider.verifyWebhook(raw, signature)) return new Response("Invalid signature", { status: 401 });

  const event = JSON.parse(raw) as RazorpayEvent;
  const entity = event.payload?.payment?.entity;
  if (event.event !== "payment.captured" || !entity) return Response.json({ ok: true, ignored: true });

  const payment = await db.payment.findUnique({ where: { providerOrderId: entity.order_id }, include: { booking: { include: { trip: { include: { driver: true } } } } } });
  if (!payment) return Response.json({ ok: true, unknownOrder: true });
  if (payment.status === "PAID") return Response.json({ ok: true, duplicate: true });

  const booking = payment.booking;
  // If the hold already expired and seats were released, the payment must be refunded manually.
  if (booking.status !== "PENDING") {
    await db.payment.update({ where: { id: payment.id }, data: { status: "PAID", providerPaymentId: entity.id, paidAt: new Date(), rawResponse: event as object } });
    console.warn("[payments] captured payment for non-pending booking — refund required", booking.code);
    return Response.json({ ok: true, needsRefund: true });
  }
  await db.$transaction([
    db.payment.update({ where: { id: payment.id }, data: { status: "PAID", providerPaymentId: entity.id, paidAt: new Date(), rawResponse: event as object } }),
    db.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED", confirmedAt: new Date(), holdExpiresAt: null } }),
  ]);
  await notifyAndDispatch([
    { userId: booking.userId, type: "BOOKING_CONFIRMED", title: "Payment received — booking confirmed", body: booking.code, link: `/passenger/bookings/${booking.id}` },
    { userId: booking.trip.driver.userId, type: "NEW_BOOKING", title: `New booking: ${booking.seatCount} seat(s)`, body: booking.code, link: `/driver/trips/${booking.tripId}` },
  ]);
  return Response.json({ ok: true });
}
