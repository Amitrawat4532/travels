"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/auth/guards";
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { safeAction } from "@/server/safe-action";
import { cancelBookingAs, createBooking } from "@/server/services/bookings";
import { cancelBookingSchema, complaintSchema, createBookingSchema, reviewSchema } from "@/validation/booking";
import { dateStringSchema } from "@/validation/common";

export async function createBookingAction(input: unknown): Promise<ActionResult<{ bookingId: string }>> {
  return safeAction<{ bookingId: string }>(async () => {
    const user = await requireUser(["PASSENGER"]);
    const limit = await rateLimit("booking", 12, 10 * 60_000, user.id);
    if (!limit.allowed) return fail("Too many booking attempts. Please wait a few minutes.");
    const parsed = createBookingSchema.safeParse(input);
    if (!parsed.success) return fail("Please check the booking details.", zodFieldErrors(parsed.error));
    const res = await createBooking(user, parsed.data);
    return {
      ok: true,
      message: res.status === "CONFIRMED" ? "Booking confirmed!" : "Seats held — complete payment to confirm.",
      data: { bookingId: res.bookingId },
    };
  });
}

export async function cancelBookingAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    const parsed = cancelBookingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail("Invalid request.");
    const { refundPaise } = await cancelBookingAs(user, parsed.data.bookingId, parsed.data.reason);
    return {
      ok: true,
      message: refundPaise > 0 ? `Booking cancelled. ₹${Math.round(refundPaise / 100)} will be refunded.` : "Booking cancelled. Seats released.",
    };
  });
}

export async function submitReviewAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["PASSENGER"]);
    const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail("Please choose a rating.", zodFieldErrors(parsed.error));
    const { bookingId, rating, comment } = parsed.data;

    await db.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: { id: bookingId, userId: user.id },
        include: { review: true, trip: { select: { driverId: true } } },
      });
      if (!booking) throw new AppError("Booking not found.");
      if (booking.status !== "COMPLETED") throw new AppError("You can rate the driver after the trip is completed.");
      if (booking.boardingStatus === "NO_SHOW") throw new AppError("This booking was marked as a no-show.");
      if (booking.review) throw new AppError("You have already rated this trip.");
      await tx.review.create({
        data: { bookingId, userId: user.id, driverId: booking.trip.driverId, rating, comment },
      });
      const agg = await tx.review.aggregate({
        where: { driverId: booking.trip.driverId, isHidden: false },
        _avg: { rating: true },
        _count: true,
      });
      await tx.driverProfile.update({
        where: { id: booking.trip.driverId },
        data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
      });
    });
    return { ok: true, message: "Thank you! Your rating helps other passengers." };
  });
}

export async function raiseComplaintAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    const limit = await rateLimit("complaint", 5, 60 * 60_000, user.id);
    if (!limit.allowed) return fail("You have raised several issues recently. Our team will get back to you.");
    const parsed = complaintSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
    if (parsed.data.bookingId) {
      const owns = await db.booking.findFirst({
        where: {
          id: parsed.data.bookingId,
          OR: [{ userId: user.id }, { trip: { driver: { userId: user.id } } }],
        },
        select: { id: true },
      });
      if (!owns) return fail("Booking not found.");
    }
    await db.complaint.create({ data: { ...parsed.data, userId: user.id } });
    return { ok: true, message: "Issue reported. Our support team will contact you within 24 hours." };
  });
}

const rideAlertSchema = z.object({
  fromSlug: z.string().min(1).max(60),
  toSlug: z.string().min(1).max(60),
  date: dateStringSchema,
});

export async function createRideAlertAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    const parsed = rideAlertSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail("Choose a route and date first.");
    const [from, to] = await Promise.all([
      db.location.findUnique({ where: { slug: parsed.data.fromSlug } }),
      db.location.findUnique({ where: { slug: parsed.data.toSlug } }),
    ]);
    if (!from || !to) return fail("Unknown location.");
    const travelDate = new Date(`${parsed.data.date}T00:00:00.000Z`);
    await db.rideAlert.upsert({
      where: { userId_fromId_toId_travelDate: { userId: user.id, fromId: from.id, toId: to.id, travelDate } },
      create: { userId: user.id, fromId: from.id, toId: to.id, travelDate },
      update: { notifiedAt: null },
    });
    return { ok: true, message: `We'll notify you when a ${from.name} → ${to.name} ride is listed.` };
  });
}

export async function toggleSavedRouteAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    const fromSlug = String(formData.get("fromSlug") ?? "");
    const toSlug = String(formData.get("toSlug") ?? "");
    const [from, to] = await Promise.all([
      db.location.findUnique({ where: { slug: fromSlug } }),
      db.location.findUnique({ where: { slug: toSlug } }),
    ]);
    if (!from || !to || from.id === to.id) return fail("Unknown route.");
    const key = { userId_fromId_toId: { userId: user.id, fromId: from.id, toId: to.id } };
    const existing = await db.savedRoute.findUnique({ where: key });
    if (existing) {
      await db.savedRoute.delete({ where: key });
      return { ok: true, message: "Route removed from saved routes." };
    }
    await db.savedRoute.create({ data: { userId: user.id, fromId: from.id, toId: to.id } });
    return { ok: true, message: "Route saved." };
  });
}

export async function markNotificationsReadAction(): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true, message: "All caught up" };
  });
}
