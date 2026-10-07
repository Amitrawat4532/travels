import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/lib/errors";
import { formatDateTime, istToDate, toIstDateString } from "@/lib/format";
import { routeKey } from "@/lib/utils";
import type { SessionUser } from "@/auth/session";
import type { CreateTripInput, UpdateTripInput } from "@/validation/trip";
import { dispatchExternal, notify, type NotificationPayload } from "@/server/notifications";
import { track } from "@/server/analytics";
import { lockTrip } from "./inventory";

async function getDriverProfileFor(user: SessionUser) {
  const driver = await db.driverProfile.findUnique({ where: { userId: user.id } });
  if (!driver) throw new AppError("Complete your driver registration first.");
  return driver;
}

export async function createTrip(user: SessionUser, input: CreateTripInput): Promise<{ tripId: string }> {
  const driver = await getDriverProfileFor(user);
  if (driver.status !== "VERIFIED") {
    throw new AppError("Your driver profile must be verified before you can publish rides.");
  }

  const [vehicle, route] = await Promise.all([
    db.vehicle.findFirst({ where: { id: input.vehicleId, driverId: driver.id } }),
    db.route.findUnique({
      where: { id: input.routeId },
      include: { origin: true, destination: true, stops: true },
    }),
  ]);
  if (!vehicle || !vehicle.isActive) throw new AppError("Choose one of your vehicles.");
  if (vehicle.status !== "APPROVED") throw new AppError("This vehicle is not approved yet.");
  if (!route || !route.isActive) throw new AppError("This route is not available.");
  if (input.totalSeats > vehicle.seatCapacity) {
    throw new AppError(`${vehicle.model} has only ${vehicle.seatCapacity} passenger seats.`);
  }

  const allowedStops = new Set(route.stops.map((s) => s.locationId));
  for (const s of input.stops) {
    if (!allowedStops.has(s.locationId)) throw new AppError("One of the stops is not on this route.");
  }

  const departureAt = istToDate(input.date, input.departureTime);
  if (departureAt.getTime() < Date.now() + 60 * 60_000) {
    throw new AppError("Departure must be at least 1 hour from now.");
  }
  if (departureAt.getTime() > Date.now() + 60 * 86_400_000) {
    throw new AppError("You can list rides up to 60 days in advance.");
  }
  const estimatedArrivalAt = new Date(departureAt.getTime() + input.durationMinutes * 60_000);
  const pricePerSeatPaise = input.priceRupees * 100;

  // A vehicle cannot be on two trips at the same time.
  const clash = await db.trip.findFirst({
    where: {
      vehicleId: vehicle.id,
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      departureAt: { lt: estimatedArrivalAt },
      estimatedArrivalAt: { gt: departureAt },
    },
    select: { departureAt: true },
  });
  if (clash) {
    throw new AppError(`This vehicle already has a trip at ${formatDateTime(clash.departureAt)}.`);
  }

  const sortedStops = [...input.stops].sort((a, b) => a.minutesFromOrigin - b.minutesFromOrigin);
  const stopsData: Prisma.TripStopCreateWithoutTripInput[] = [
    {
      location: { connect: { id: route.originId } },
      sequence: 0,
      pointName: input.boardingPoint,
      scheduledAt: departureAt,
      fareFromOriginPaise: 0,
    },
    ...sortedStops.map((s, i) => ({
      location: { connect: { id: s.locationId } },
      sequence: i + 1,
      pointName: s.pointName,
      scheduledAt: new Date(departureAt.getTime() + s.minutesFromOrigin * 60_000),
      fareFromOriginPaise: s.fareRupees * 100,
    })),
    {
      location: { connect: { id: route.destinationId } },
      sequence: sortedStops.length + 1,
      pointName: input.dropPoint,
      scheduledAt: estimatedArrivalAt,
      fareFromOriginPaise: pricePerSeatPaise,
    },
  ];

  const trip = await db.trip.create({
    data: {
      driverId: driver.id,
      vehicleId: vehicle.id,
      routeId: route.id,
      departureAt,
      estimatedArrivalAt,
      totalSeats: input.totalSeats,
      pricePerSeatPaise,
      boardingPoint: input.boardingPoint,
      dropPoint: input.dropPoint,
      notes: input.notes,
      cancellationHours: input.cancellationHours,
      stops: { create: stopsData },
      seats: {
        create: Array.from({ length: input.totalSeats }, (_, i) => ({ seatNumber: i + 1 })),
      },
    },
    include: { stops: { orderBy: { sequence: "asc" } } },
  });

  track({
    type: "TRIP_PUBLISHED",
    userId: user.id,
    tripId: trip.id,
    routeKey: routeKey(route.origin.slug, route.destination.slug),
    value: input.totalSeats,
  });

  await notifyRideAlerts(trip.id).catch((e) => console.warn("[ride-alerts] failed", e));
  return { tripId: trip.id };
}

/** Tell passengers who asked "notify me" for a covered segment on that date. */
async function notifyRideAlerts(tripId: string) {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: { stops: { include: { location: true }, orderBy: { sequence: "asc" } } },
  });
  if (!trip) return;
  const day = toIstDateString(trip.departureAt);
  const seqByLocation = new Map(trip.stops.map((s) => [s.locationId, s.sequence]));
  const alerts = await db.rideAlert.findMany({
    where: {
      notifiedAt: null,
      travelDate: new Date(`${day}T00:00:00.000Z`),
      fromId: { in: [...seqByLocation.keys()] },
      toId: { in: [...seqByLocation.keys()] },
    },
    include: { from: true, to: true },
  });
  const matching = alerts.filter((a) => (seqByLocation.get(a.fromId) ?? 99) < (seqByLocation.get(a.toId) ?? -1));
  if (matching.length === 0) return;
  const payloads: NotificationPayload[] = matching.map((a) => ({
    userId: a.userId,
    type: "RIDE_ALERT",
    title: `Ride available: ${a.from.name} → ${a.to.name}`,
    body: `A verified driver just listed a ride on ${formatDateTime(trip.departureAt)}. Book before seats fill up.`,
    link: `/rides/${trip.id}?from=${a.from.slug}&to=${a.to.slug}`,
  }));
  await db.$transaction([
    db.notification.createMany({ data: payloads }),
    db.rideAlert.updateMany({ where: { id: { in: matching.map((a) => a.id) } }, data: { notifiedAt: new Date() } }),
  ]);
  void dispatchExternal(payloads);
}

async function getOwnedTrip(user: SessionUser, tripId: string) {
  const driver = await getDriverProfileFor(user);
  const trip = await db.trip.findFirst({
    where: { id: tripId, driverId: driver.id },
    include: { vehicle: true },
  });
  if (!trip) throw new AppError("Trip not found.");
  return { driver, trip };
}

export async function updateTrip(user: SessionUser, input: UpdateTripInput): Promise<void> {
  const { trip } = await getOwnedTrip(user, input.tripId);
  if (trip.status !== "SCHEDULED") throw new AppError("Only upcoming trips can be edited.");
  if (input.totalSeats > trip.vehicle.seatCapacity) {
    throw new AppError(`${trip.vehicle.model} has only ${trip.vehicle.seatCapacity} passenger seats.`);
  }

  const departureAt = istToDate(input.date, input.departureTime);
  if (departureAt.getTime() < Date.now() + 30 * 60_000) {
    throw new AppError("Departure must be at least 30 minutes from now.");
  }
  const estimatedArrivalAt = new Date(departureAt.getTime() + input.durationMinutes * 60_000);
  const shiftMs = departureAt.getTime() - trip.departureAt.getTime();
  const timeChanged = shiftMs !== 0;
  const oldDurationMs = trip.estimatedArrivalAt.getTime() - trip.departureAt.getTime();
  const durationScale = (input.durationMinutes * 60_000) / oldDurationMs;

  const notifications = await db.$transaction(async (tx) => {
    await lockTrip(tx, trip.id);

    // Seat inventory changes — only possible for seats nobody holds.
    if (input.totalSeats !== trip.totalSeats) {
      if (input.totalSeats > trip.totalSeats) {
        await tx.tripSeat.createMany({
          data: Array.from({ length: input.totalSeats - trip.totalSeats }, (_, i) => ({
            tripId: trip.id,
            seatNumber: trip.totalSeats + i + 1,
          })),
        });
      } else {
        const removable = await tx.tripSeat.findMany({
          where: { tripId: trip.id, seatNumber: { gt: input.totalSeats } },
          select: { seatNumber: true, status: true },
        });
        const booked = removable.filter((s) => s.status === "BOOKED").map((s) => s.seatNumber);
        if (booked.length > 0) {
          throw new AppError(
            `Seat ${booked.join(", ")} ${booked.length === 1 ? "is" : "are"} already booked, so you can't reduce below ${Math.max(...booked)} seats.`,
          );
        }
        await tx.tripSeat.deleteMany({ where: { tripId: trip.id, seatNumber: { gt: input.totalSeats } } });
      }
    }

    await tx.trip.update({
      where: { id: trip.id },
      data: {
        departureAt,
        estimatedArrivalAt,
        boardingPoint: input.boardingPoint,
        dropPoint: input.dropPoint,
        totalSeats: input.totalSeats,
        notes: input.notes ?? null,
      },
    });

    // Keep stop schedule consistent with the new departure / duration.
    const stops = await tx.tripStop.findMany({ where: { tripId: trip.id }, orderBy: { sequence: "asc" } });
    const last = stops.length - 1;
    for (const s of stops) {
      const offset = s.scheduledAt.getTime() - trip.departureAt.getTime();
      const scheduledAt =
        s.sequence === 0
          ? departureAt
          : s.sequence === stops[last]?.sequence
            ? estimatedArrivalAt
            : new Date(departureAt.getTime() + Math.round(offset * durationScale));
      await tx.tripStop.update({
        where: { id: s.id },
        data: {
          scheduledAt,
          ...(s.sequence === 0 ? { pointName: input.boardingPoint } : {}),
          ...(s.sequence === stops[last]?.sequence ? { pointName: input.dropPoint } : {}),
        },
      });
    }

    const active = await tx.booking.findMany({
      where: { tripId: trip.id, status: { in: ["CONFIRMED", "PENDING"] } },
      select: { id: true, userId: true, code: true },
    });
    const pointsChanged = input.boardingPoint !== trip.boardingPoint || input.dropPoint !== trip.dropPoint;
    if (!timeChanged && !pointsChanged) return [];
    const payloads: NotificationPayload[] = active.map((b) => ({
      userId: b.userId,
      type: "TRIP_UPDATED",
      title: "Your ride details changed",
      body: timeChanged
        ? `${b.code}: new departure ${formatDateTime(departureAt)}. You can cancel free of charge if this doesn't work for you.`
        : `${b.code}: pickup/drop point updated — please check the booking.`,
      link: `/passenger/bookings/${b.id}`,
    }));
    await notify(payloads, tx);
    return payloads;
  });
  void dispatchExternal(notifications);
}

/** Driver blocks a seat for an offline passenger, or frees it again. */
export async function toggleSeatBlock(user: SessionUser, tripId: string, seatNumber: number): Promise<void> {
  const { trip } = await getOwnedTrip(user, tripId);
  if (trip.status !== "SCHEDULED") throw new AppError("Seats can only be changed on upcoming trips.");
  await db.$transaction(async (tx) => {
    await lockTrip(tx, trip.id);
    const seat = await tx.tripSeat.findUnique({ where: { tripId_seatNumber: { tripId: trip.id, seatNumber } } });
    if (!seat) throw new AppError("Seat not found.");
    if (seat.status === "BOOKED") throw new AppError("This seat is booked by a passenger.");
    await tx.tripSeat.update({
      where: { id: seat.id },
      data: { status: seat.status === "BLOCKED" ? "AVAILABLE" : "BLOCKED" },
    });
  });
}

export async function cancelTrip(user: SessionUser | null, tripId: string, reason: string, asAdmin = false) {
  const trip = asAdmin
    ? await db.trip.findUnique({ where: { id: tripId } })
    : (await getOwnedTrip(user as SessionUser, tripId)).trip;
  if (!trip) throw new AppError("Trip not found.");
  if (trip.status !== "SCHEDULED") throw new AppError("Only upcoming trips can be cancelled.");
  const now = new Date();

  const payloads = await db.$transaction(async (tx) => {
    await lockTrip(tx, trip.id);
    const bookings = await tx.booking.findMany({
      where: { tripId: trip.id, status: { in: ["CONFIRMED", "PENDING"] } },
      include: { payments: true },
    });
    for (const b of bookings) {
      const paid = b.payments.find((p) => p.status === "PAID");
      await tx.booking.update({
        where: { id: b.id },
        data: {
          status: paid ? "REFUNDED" : "CANCELLED",
          cancelledBy: asAdmin ? "ADMIN" : "DRIVER",
          cancelReason: reason,
          cancelledAt: now,
          refundablePaise: paid ? b.totalPaise : 0,
        },
      });
      if (paid) {
        await tx.payment.update({
          where: { id: paid.id },
          data: { status: "REFUNDED", refundAmountPaise: b.totalPaise, refundedAt: now },
        });
      }
    }
    await tx.payment.updateMany({
      where: { booking: { tripId: trip.id }, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    await tx.tripSeat.updateMany({ where: { tripId: trip.id }, data: { status: "AVAILABLE", bookingId: null } });
    await tx.trip.update({
      where: { id: trip.id },
      data: { status: "CANCELLED", cancelReason: reason, cancelledAt: now },
    });
    const out: NotificationPayload[] = bookings.map((b) => ({
      userId: b.userId,
      type: "TRIP_CANCELLED",
      title: "Driver cancelled your ride",
      body: `${b.code} · ${formatDateTime(trip.departureAt)} — ${reason}. Search for another ride on the same route.`,
      link: `/passenger/bookings/${b.id}`,
    }));
    await notify(out, tx);
    return out;
  });
  void dispatchExternal(payloads);
  return { affectedBookings: payloads.length };
}

export async function startTrip(user: SessionUser, tripId: string) {
  const { trip } = await getOwnedTrip(user, tripId);
  if (trip.status !== "SCHEDULED") throw new AppError("This trip cannot be started.");
  if (trip.departureAt.getTime() - Date.now() > 2 * 3_600_000) {
    throw new AppError("You can start the trip up to 2 hours before departure.");
  }
  await db.trip.update({ where: { id: trip.id }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
}

export async function setBoardingStatus(
  user: SessionUser,
  bookingId: string,
  status: "BOARDED" | "NO_SHOW" | "NOT_BOARDED",
  paymentCollected: boolean,
) {
  const driver = await getDriverProfileFor(user);
  const booking = await db.booking.findFirst({
    where: { id: bookingId, trip: { driverId: driver.id } },
    include: { trip: true, payments: true },
  });
  if (!booking) throw new AppError("Booking not found.");
  if (booking.status !== "CONFIRMED") throw new AppError("Only confirmed bookings can be updated.");
  if (booking.trip.status === "CANCELLED" || booking.trip.status === "COMPLETED") {
    throw new AppError("This trip is closed.");
  }
  if (booking.trip.departureAt.getTime() - Date.now() > 3 * 3_600_000) {
    throw new AppError("Boarding can be marked from 3 hours before departure.");
  }
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { boardingStatus: status } });
    const pending = booking.payments.find((p) => p.status === "PENDING" && p.method === "PAY_TO_DRIVER");
    if (status === "BOARDED" && paymentCollected && pending) {
      await tx.payment.update({ where: { id: pending.id }, data: { status: "PAID", paidAt: new Date() } });
    }
  });
}

export async function completeTrip(user: SessionUser, tripId: string) {
  const { trip, driver } = await getOwnedTrip(user, tripId);
  if (trip.status !== "SCHEDULED" && trip.status !== "IN_PROGRESS") {
    throw new AppError("This trip is already closed.");
  }
  if (trip.departureAt.getTime() > Date.now()) {
    throw new AppError("You can mark the trip completed after departure.");
  }
  const now = new Date();
  const payloads = await db.$transaction(async (tx) => {
    await lockTrip(tx, trip.id);
    // Unpaid online holds can never complete.
    const pendingOnline = await tx.booking.findMany({ where: { tripId: trip.id, status: "PENDING" }, select: { id: true } });
    if (pendingOnline.length) {
      await tx.booking.updateMany({
        where: { id: { in: pendingOnline.map((b) => b.id) } },
        data: { status: "CANCELLED", cancelledBy: "SYSTEM", cancelReason: "Payment not completed", cancelledAt: now },
      });
    }
    const bookings = await tx.booking.findMany({
      where: { tripId: trip.id, status: "CONFIRMED" },
      select: { id: true, userId: true, code: true, boardingStatus: true },
    });
    await tx.booking.updateMany({
      where: { tripId: trip.id, status: "CONFIRMED" },
      data: { status: "COMPLETED", completedAt: now },
    });
    await tx.trip.update({
      where: { id: trip.id },
      data: { status: "COMPLETED", completedAt: now, startedAt: trip.startedAt ?? trip.departureAt },
    });
    await tx.driverProfile.update({ where: { id: driver.id }, data: { completedTrips: { increment: 1 } } });
    const out: NotificationPayload[] = bookings
      .filter((b) => b.boardingStatus !== "NO_SHOW")
      .map((b) => ({
        userId: b.userId,
        type: "TRIP_COMPLETED",
        title: "Safe pahunch gaye? Rate your driver",
        body: `${b.code} is complete. A quick rating helps other passengers choose trusted drivers.`,
        link: `/passenger/bookings/${b.id}#review`,
      }));
    await notify(out, tx);
    return out;
  });
  void dispatchExternal(payloads);
}

/** Cron: notify passengers & drivers about trips departing in the next 24h. */
export async function sendTripReminders(now = new Date()): Promise<number> {
  const trips = await db.trip.findMany({
    where: {
      status: "SCHEDULED",
      reminderSentAt: null,
      departureAt: { gt: now, lte: new Date(now.getTime() + 24 * 3_600_000) },
    },
    include: {
      driver: { select: { userId: true } },
      route: { include: { origin: true, destination: true } },
      bookings: {
        where: { status: "CONFIRMED" },
        include: { boardingStop: true },
      },
    },
  });
  let count = 0;
  for (const trip of trips) {
    const label = `${trip.route.origin.name} → ${trip.route.destination.name}`;
    const payloads: NotificationPayload[] = trip.bookings.map((b) => ({
      userId: b.userId,
      type: "TRIP_REMINDER",
      title: `Reminder: ${label} at ${formatDateTime(b.boardingStop.scheduledAt)}`,
      body: `Please reach ${b.boardingStop.pointName} 10 minutes early. Booking ${b.code}, seat ${b.seatNumbers.join(", ")}.`,
      link: `/passenger/bookings/${b.id}`,
    }));
    payloads.push({
      userId: trip.driver.userId,
      type: "TRIP_REMINDER",
      title: `Trip reminder: ${label}`,
      body: `${formatDateTime(trip.departureAt)} · ${trip.bookings.reduce((n, b) => n + b.seatCount, 0)} seats booked.`,
      link: `/driver/trips/${trip.id}`,
    });
    await db.$transaction([
      db.notification.createMany({ data: payloads }),
      db.trip.update({ where: { id: trip.id }, data: { reminderSentAt: now } }),
    ]);
    void dispatchExternal(payloads);
    count += payloads.length;
  }
  return count;
}
