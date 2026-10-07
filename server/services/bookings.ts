import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type CancelledBy } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/lib/errors";
import {
  BOOKING_CUTOFF_MINUTES,
  LATE_CANCELLATION_REFUND_PERCENT,
  PAYMENT_HOLD_MINUTES,
  PLATFORM_FEE_PER_SEAT_PAISE,
} from "@/lib/constants";
import { formatDateTime, formatPaise } from "@/lib/format";
import { routeKey } from "@/lib/utils";
import type { SessionUser } from "@/auth/session";
import type { CreateBookingInput } from "@/validation/booking";
import { getPaymentProvider } from "@/server/payments";
import { dispatchExternal, notify, type NotificationPayload } from "@/server/notifications";
import { track } from "@/server/analytics";
import { lockTrip, releaseExpiredHolds } from "./inventory";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateBookingCode(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `PS-${out}`;
}

/** Fare for one seat between two stops of a trip. */
export function segmentFarePaise(
  boarding: { fareFromOriginPaise: number },
  drop: { fareFromOriginPaise: number },
): number {
  return Math.max(drop.fareFromOriginPaise - boarding.fareFromOriginPaise, 0);
}

export function priceBreakdown(farePerSeatPaise: number, seats: number) {
  const fareTotalPaise = farePerSeatPaise * seats;
  const platformFeePaise = PLATFORM_FEE_PER_SEAT_PAISE * seats;
  return { fareTotalPaise, platformFeePaise, totalPaise: fareTotalPaise + platformFeePaise };
}

export type CreateBookingResult = { bookingId: string; code: string; status: "CONFIRMED" | "PENDING" };

export async function createBooking(
  user: SessionUser,
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const provider = getPaymentProvider();
  const now = new Date();

  track({ type: "BOOKING_ATTEMPT", userId: user.id, tripId: input.tripId, value: input.seatNumbers.length });

  const attempt = async () =>
    db.$transaction(
      async (tx) => {
        await lockTrip(tx, input.tripId);

        const trip = await tx.trip.findUnique({
          where: { id: input.tripId },
          include: {
            stops: { include: { location: true }, orderBy: { sequence: "asc" } },
            driver: { select: { userId: true, status: true } },
            route: { include: { origin: true, destination: true } },
          },
        });
        if (!trip) throw new AppError("This ride no longer exists.");
        if (trip.status !== "SCHEDULED") {
          throw new AppError(
            trip.status === "CANCELLED" ? "The driver has cancelled this ride." : "This ride is no longer open for booking.",
          );
        }
        if (trip.departureAt.getTime() - BOOKING_CUTOFF_MINUTES * 60_000 <= now.getTime()) {
          throw new AppError("Booking for this ride has closed — it departs too soon or has already left.");
        }
        if (trip.driver.status !== "VERIFIED") throw new AppError("This ride is not available right now.");
        if (trip.driver.userId === user.id) throw new AppError("You cannot book seats on your own ride.");

        const boarding = trip.stops.find((s) => s.id === input.boardingStopId);
        const drop = trip.stops.find((s) => s.id === input.dropStopId);
        if (!boarding || !drop) throw new AppError("Please choose valid boarding and drop points.");
        if (boarding.sequence >= drop.sequence) {
          throw new AppError("Drop point must come after the boarding point on this route.");
        }

        const outOfRange = input.seatNumbers.find((n) => n > trip.totalSeats);
        if (outOfRange) throw new AppError(`Seat ${outOfRange} does not exist on this vehicle.`);

        const existing = await tx.booking.findFirst({
          where: { tripId: trip.id, userId: user.id, status: { in: ["PENDING", "CONFIRMED"] } },
          select: { code: true },
        });
        if (existing) {
          throw new AppError(
            `You already have booking ${existing.code} on this ride. Cancel it first if you want to change seats.`,
          );
        }

        await releaseExpiredHolds(tx, trip.id, now);

        const farePerSeatPaise = segmentFarePaise(boarding, drop);
        const seatCount = input.seatNumbers.length;
        const price = priceBreakdown(farePerSeatPaise, seatCount);
        const confirmsNow = provider.id === "pay_to_driver";

        const booking = await tx.booking.create({
          data: {
            code: generateBookingCode(),
            tripId: trip.id,
            userId: user.id,
            boardingStopId: boarding.id,
            dropStopId: drop.id,
            seatCount,
            seatNumbers: [...input.seatNumbers].sort((a, b) => a - b),
            farePerSeatPaise,
            ...price,
            contactPhone: input.contactPhone,
            status: confirmsNow ? "CONFIRMED" : "PENDING",
            confirmedAt: confirmsNow ? now : null,
            holdExpiresAt: confirmsNow ? null : new Date(now.getTime() + PAYMENT_HOLD_MINUTES * 60_000),
            passengers: {
              create: input.passengers.map((p) => ({ name: p.name, phone: p.phone, seatNumber: p.seatNumber })),
            },
          },
        });

        // Atomic seat claim. Only rows still AVAILABLE are updated; if any seat
        // was taken in the meantime the count is short and we roll back.
        const claimed = await tx.tripSeat.updateMany({
          where: {
            tripId: trip.id,
            seatNumber: { in: input.seatNumbers },
            status: "AVAILABLE",
            bookingId: null,
          },
          data: { status: "BOOKED", bookingId: booking.id },
        });
        if (claimed.count !== seatCount) {
          throw new AppError("Sorry, one or more of the selected seats was just booked by someone else. Please pick again.", "SEAT_TAKEN");
        }

        await tx.payment.create({
          data: {
            bookingId: booking.id,
            provider: provider.id,
            method: confirmsNow ? "PAY_TO_DRIVER" : "ONLINE",
            status: "PENDING",
            amountPaise: price.totalPaise,
          },
        });

        const routeLabel = `${boarding.location.name} → ${drop.location.name}`;
        const notifications: NotificationPayload[] = confirmsNow
          ? [
              {
                userId: user.id,
                type: "BOOKING_CONFIRMED",
                title: "Booking confirmed",
                body: `${routeLabel} · ${formatDateTime(trip.departureAt)} · Seat ${booking.seatNumbers.join(", ")} · ${booking.code}`,
                link: `/passenger/bookings/${booking.id}`,
              },
              {
                userId: trip.driver.userId,
                type: "NEW_BOOKING",
                title: `New booking: ${seatCount} ${seatCount === 1 ? "seat" : "seats"}`,
                body: `${user.name} · ${boarding.pointName} → ${drop.pointName} · ${formatDateTime(trip.departureAt)}`,
                link: `/driver/trips/${trip.id}`,
              },
            ]
          : [];
        await notify(notifications, tx);

        return {
          booking,
          notifications,
          routeKey: routeKey(trip.route.origin.slug, trip.route.destination.slug),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10_000 },
    );

  let result: Awaited<ReturnType<typeof attempt>>;
  try {
    result = await attempt();
  } catch (e) {
    // Booking code collision is astronomically rare — retry once.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      result = await attempt();
    } else {
      track({
        type: "BOOKING_FAILED",
        userId: user.id,
        tripId: input.tripId,
        metadata: { reason: e instanceof Error ? e.message.slice(0, 120) : "unknown" },
      });
      throw e;
    }
  }

  const { booking } = result;

  if (provider.id !== "pay_to_driver") {
    try {
      const payment = await provider.createPayment({
        bookingId: booking.id,
        bookingCode: booking.code,
        amountPaise: booking.totalPaise,
        customer: { name: user.name, email: user.email, phone: user.phone },
      });
      await db.payment.updateMany({
        where: { bookingId: booking.id, status: "PENDING" },
        data: {
          providerOrderId: payment.providerOrderId,
          rawResponse: (payment.raw ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (e) {
      console.error("[payments] order creation failed", e);
      await cancelBookingInternal(booking.id, "SYSTEM", "Payment could not be started");
      throw new AppError("We could not start the payment. Your seats were released — please try again.");
    }
  } else {
    void dispatchExternal(result.notifications);
  }

  track({
    type: "BOOKING_SUCCESS",
    userId: user.id,
    tripId: booking.tripId,
    routeKey: result.routeKey,
    value: booking.totalPaise,
    metadata: { seats: booking.seatCount },
  });

  return {
    bookingId: booking.id,
    code: booking.code,
    status: booking.status === "CONFIRMED" ? "CONFIRMED" : "PENDING",
  };
}

/** Refund owed if the booking is cancelled now by the passenger. */
export function computeRefundPaise(
  booking: { totalPaise: number; fareTotalPaise: number },
  trip: { departureAt: Date; cancellationHours: number },
  paid: boolean,
  cancelledBy: CancelledBy,
  now = new Date(),
): number {
  if (!paid) return 0;
  if (cancelledBy !== "PASSENGER") return booking.totalPaise; // driver/admin/system cancellations refund in full
  const hoursLeft = (trip.departureAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft >= trip.cancellationHours) return booking.totalPaise;
  return Math.round((booking.fareTotalPaise * LATE_CANCELLATION_REFUND_PERCENT) / 100);
}

export function cancellationPolicyText(cancellationHours: number): string {
  if (cancellationHours === 0) {
    return `Cancel any time before departure. Online payments are refunded ${LATE_CANCELLATION_REFUND_PERCENT}% of the fare after booking closes.`;
  }
  return `Free cancellation up to ${cancellationHours} hours before departure. After that, ${LATE_CANCELLATION_REFUND_PERCENT}% of the fare is refunded for online payments. Pay-at-boarding bookings can be cancelled free until departure.`;
}

/**
 * Cancel a booking and return its seats to inventory. Authorisation is the
 * caller's responsibility (see cancelBookingAs).
 */
async function cancelBookingInternal(
  bookingId: string,
  cancelledBy: CancelledBy,
  reason: string | undefined,
): Promise<{ refundPaise: number; notifications: NotificationPayload[] }> {
  const now = new Date();
  const out = await db.$transaction(async (tx) => {
    const pre = await tx.booking.findUnique({ where: { id: bookingId }, select: { tripId: true } });
    if (!pre) throw new AppError("Booking not found.");
    await lockTrip(tx, pre.tripId);

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: { include: { driver: { select: { userId: true } } } },
        boardingStop: { include: { location: true } },
        dropStop: { include: { location: true } },
        payments: true,
        user: { select: { name: true } },
      },
    });
    if (!booking) throw new AppError("Booking not found.");
    if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
      throw new AppError("This booking is already closed and cannot be cancelled.");
    }
    if (cancelledBy === "PASSENGER" && booking.trip.departureAt <= now) {
      throw new AppError("This ride has already departed. Please contact support for help.");
    }
    if (booking.trip.status === "COMPLETED") throw new AppError("This trip is already completed.");

    const paidPayment = booking.payments.find((p) => p.status === "PAID");
    const refundPaise = computeRefundPaise(booking, booking.trip, Boolean(paidPayment), cancelledBy, now);

    await tx.tripSeat.updateMany({
      where: { bookingId: booking.id },
      data: { status: "AVAILABLE", bookingId: null },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: refundPaise > 0 ? "REFUNDED" : "CANCELLED",
        cancelledBy,
        cancelReason: reason ?? null,
        cancelledAt: now,
        refundablePaise: refundPaise,
      },
    });
    if (paidPayment) {
      // Refund is recorded as owed; the gateway refund call is made by the
      // payment provider integration (see README "Payments").
      await tx.payment.update({
        where: { id: paidPayment.id },
        data: refundPaise > 0 ? { status: "REFUNDED", refundAmountPaise: refundPaise, refundedAt: now } : {},
      });
    }
    await tx.payment.updateMany({
      where: { bookingId: booking.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    const label = `${booking.boardingStop.location.name} → ${booking.dropStop.location.name}, ${formatDateTime(booking.trip.departureAt)}`;
    const notifications: NotificationPayload[] = [];
    if (cancelledBy !== "PASSENGER") {
      notifications.push({
        userId: booking.userId,
        type: "BOOKING_CANCELLED",
        title: "Your booking was cancelled",
        body: `${booking.code} · ${label}${reason ? ` — ${reason}` : ""}${refundPaise > 0 ? ` · Refund ${formatPaise(refundPaise)}` : ""}`,
        link: `/passenger/bookings/${booking.id}`,
      });
    } else {
      notifications.push({
        userId: booking.userId,
        type: "BOOKING_CANCELLED",
        title: "Booking cancelled",
        body: `${booking.code} · ${label}${refundPaise > 0 ? ` · Refund ${formatPaise(refundPaise)}` : ""}`,
        link: `/passenger/bookings/${booking.id}`,
      });
    }
    if (cancelledBy !== "DRIVER" && booking.status === "CONFIRMED") {
      notifications.push({
        userId: booking.trip.driver.userId,
        type: "BOOKING_CANCELLED",
        title: `${booking.seatCount} ${booking.seatCount === 1 ? "seat" : "seats"} freed up`,
        body: `${booking.user.name} cancelled ${booking.code} · ${label}`,
        link: `/driver/trips/${booking.tripId}`,
      });
    }
    await notify(notifications, tx);
    return { refundPaise, notifications, tripId: booking.tripId, userId: booking.userId, total: booking.totalPaise };
  });

  track({ type: "BOOKING_CANCELLED", userId: out.userId, tripId: out.tripId, value: out.total, metadata: { cancelledBy } });
  void dispatchExternal(out.notifications);
  return { refundPaise: out.refundPaise, notifications: out.notifications };
}

export async function cancelBookingAs(
  actor: SessionUser,
  bookingId: string,
  reason?: string,
): Promise<{ refundPaise: number }> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true, trip: { select: { driver: { select: { userId: true } } } } },
  });
  if (!booking) throw new AppError("Booking not found.");

  let cancelledBy: CancelledBy;
  if (actor.role === "ADMIN") cancelledBy = "ADMIN";
  else if (booking.userId === actor.id) cancelledBy = "PASSENGER";
  else if (actor.role === "DRIVER" && booking.trip.driver.userId === actor.id) {
    // Drivers mark no-shows or cancel the whole trip; they cannot drop a single passenger.
    throw new AppError("Drivers cannot cancel individual bookings. Mark the passenger as no-show or contact support.");
  } else throw new AppError("Booking not found."); // do not leak existence

  const { refundPaise } = await cancelBookingInternal(bookingId, cancelledBy, reason);
  return { refundPaise };
}

export { cancelBookingInternal };
