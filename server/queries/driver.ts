import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

export async function getDriverContext(userId: string) {
  return db.driverProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true, phone: true, email: true, avatarKey: true } },
      vehicles: { orderBy: { createdAt: "asc" } },
      baseLocation: true,
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
}

export type DriverContext = NonNullable<Awaited<ReturnType<typeof getDriverContext>>>;

const tripCardInclude = {
  route: { include: { origin: true, destination: true } },
  vehicle: { select: { model: true, type: true, registrationNumber: true } },
  seats: { select: { seatNumber: true, status: true } },
  bookings: {
    where: { status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] } },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { name: true } },
      boardingStop: { include: { location: true } },
      dropStop: { include: { location: true } },
    },
  },
} satisfies Prisma.TripInclude;

export type DriverTripCard = Prisma.TripGetPayload<{ include: typeof tripCardInclude }>;

export function seatCounts(trip: { totalSeats: number; seats: { status: string }[] }) {
  const booked = trip.seats.filter((s) => s.status === "BOOKED").length;
  const blocked = trip.seats.filter((s) => s.status === "BLOCKED").length;
  return { total: trip.totalSeats, booked, blocked, available: trip.totalSeats - booked - blocked };
}

export async function getDriverTrips(driverId: string, scope: "upcoming" | "past") {
  const now = new Date();
  return db.trip.findMany({
    where:
      scope === "upcoming"
        ? { driverId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } }
        : { driverId, OR: [{ status: { in: ["COMPLETED", "CANCELLED"] } }, { departureAt: { lt: new Date(now.getTime() - 24 * 3_600_000) }, status: "SCHEDULED" }] },
    include: tripCardInclude,
    orderBy: { departureAt: scope === "upcoming" ? "asc" : "desc" },
    take: 100,
  });
}

export async function getDriverStats(driverId: string) {
  const [upcoming, totalTrips, cancelledTrips, sold, earnings, passengers] = await Promise.all([
    db.trip.count({ where: { driverId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } } }),
    db.trip.count({ where: { driverId } }),
    db.trip.count({ where: { driverId, status: "CANCELLED" } }),
    db.booking.aggregate({ where: { trip: { driverId }, status: { in: ["CONFIRMED", "COMPLETED"] } }, _sum: { seatCount: true } }),
    db.booking.aggregate({ where: { trip: { driverId }, status: "COMPLETED" }, _sum: { fareTotalPaise: true } }),
    db.booking.groupBy({ by: ["userId"], where: { trip: { driverId }, status: { in: ["CONFIRMED", "COMPLETED"] } } }),
  ]);
  return {
    upcoming,
    totalTrips,
    seatsSold: sold._sum.seatCount ?? 0,
    earningsPaise: earnings._sum.fareTotalPaise ?? 0,
    passengers: passengers.length,
    cancellationRate: totalTrips ? Math.round((cancelledTrips / totalTrips) * 100) : 0,
  };
}

/** Full trip for the driver's manage screen — includes passenger contact details. */
export async function getDriverTrip(driverId: string, tripId: string) {
  return db.trip.findFirst({
    where: { id: tripId, driverId },
    include: {
      route: { include: { origin: true, destination: true, stops: true } },
      vehicle: true,
      stops: { include: { location: true }, orderBy: { sequence: "asc" } },
      seats: { orderBy: { seatNumber: "asc" }, select: { seatNumber: true, status: true, bookingId: true } },
      bookings: {
        orderBy: [{ boardingStop: { sequence: "asc" } }, { createdAt: "asc" }],
        include: {
          user: { select: { name: true, phone: true } },
          passengers: { orderBy: { seatNumber: "asc" } },
          boardingStop: { include: { location: true } },
          dropStop: { include: { location: true } },
          payments: { select: { status: true, method: true } },
        },
      },
    },
  });
}

export async function getDriverBookings(driverId: string) {
  return db.booking.findMany({
    where: { trip: { driverId } },
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      user: { select: { name: true, phone: true } },
      trip: { select: { id: true, departureAt: true, status: true, route: { include: { origin: true, destination: true } } } },
      boardingStop: { include: { location: true } },
      dropStop: { include: { location: true } },
    },
  });
}

export async function getDriverEarnings(driverId: string) {
  const completed = await db.booking.findMany({
    where: { trip: { driverId }, status: "COMPLETED" },
    select: {
      fareTotalPaise: true,
      seatCount: true,
      completedAt: true,
      payments: { select: { status: true, method: true } },
      trip: { select: { id: true, departureAt: true, route: { include: { origin: true, destination: true } } } },
    },
    orderBy: { completedAt: "desc" },
  });
  const upcoming = await db.booking.aggregate({
    where: { trip: { driverId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } }, status: "CONFIRMED" },
    _sum: { fareTotalPaise: true, seatCount: true },
  });

  const byTrip = new Map<string, { tripId: string; label: string; date: Date; seats: number; fare: number }>();
  let collected = 0;
  let pendingCollection = 0;
  for (const b of completed) {
    const key = b.trip.id;
    const row = byTrip.get(key) ?? {
      tripId: key,
      label: `${b.trip.route.origin.name} → ${b.trip.route.destination.name}`,
      date: b.trip.departureAt,
      seats: 0,
      fare: 0,
    };
    row.seats += b.seatCount;
    row.fare += b.fareTotalPaise;
    byTrip.set(key, row);
    if (b.payments.some((p) => p.status === "PAID")) collected += b.fareTotalPaise;
    else pendingCollection += b.fareTotalPaise;
  }

  // Last 6 months, keyed YYYY-MM in IST.
  const months = new Map<string, number>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 15));
    months.set(d.toISOString().slice(0, 7), 0);
  }
  for (const b of completed) {
    const k = new Date((b.completedAt ?? b.trip.departureAt).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 7);
    if (months.has(k)) months.set(k, (months.get(k) ?? 0) + b.fareTotalPaise);
  }

  return {
    totalPaise: collected + pendingCollection,
    collectedPaise: collected,
    pendingCollectionPaise: pendingCollection,
    upcomingPaise: upcoming._sum.fareTotalPaise ?? 0,
    upcomingSeats: upcoming._sum.seatCount ?? 0,
    trips: [...byTrip.values()],
    monthly: [...months.entries()].map(([month, paise]) => ({ month, paise })),
  };
}
