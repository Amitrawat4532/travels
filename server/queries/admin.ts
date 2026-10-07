import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { toIstDateString } from "@/lib/format";

export async function getAdminOverview() {
  const [
    users,
    passengers,
    drivers,
    verifiedDrivers,
    pendingDrivers,
    activeTrips,
    totalBookings,
    completedTrips,
    revenue,
    openComplaints,
    pendingVehicles,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "PASSENGER" } }),
    db.user.count({ where: { role: "DRIVER" } }),
    db.driverProfile.count({ where: { status: "VERIFIED" } }),
    db.driverProfile.count({ where: { status: "PENDING" } }),
    db.trip.count({ where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] }, departureAt: { gt: new Date(Date.now() - 12 * 3_600_000) } } }),
    db.booking.count(),
    db.trip.count({ where: { status: "COMPLETED" } }),
    db.booking.aggregate({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } }, _sum: { platformFeePaise: true, totalPaise: true } }),
    db.complaint.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.vehicle.count({ where: { status: "PENDING", driver: { status: { in: ["PENDING", "VERIFIED"] } } } }),
  ]);
  return {
    users,
    passengers,
    drivers,
    verifiedDrivers,
    pendingDrivers,
    activeTrips,
    totalBookings,
    completedTrips,
    platformRevenuePaise: revenue._sum.platformFeePaise ?? 0,
    gmvPaise: revenue._sum.totalPaise ?? 0,
    openComplaints,
    pendingVehicles,
  };
}

type DayRow = { day: string; bookings: bigint; revenue: bigint | null };

/** Bookings and platform revenue per IST day for the last `days` days. */
export async function getDailySeries(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db.$queryRaw<DayRow[]>(Prisma.sql`
    SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
           COUNT(*)::bigint AS bookings,
           SUM(CASE WHEN status IN ('CONFIRMED','COMPLETED') THEN "platformFeePaise" ELSE 0 END)::bigint AS revenue
    FROM "Booking"
    WHERE "createdAt" >= ${since}
    GROUP BY 1 ORDER BY 1`);
  const map = new Map(rows.map((r) => [r.day, r]));
  const out: { day: string; bookings: number; revenuePaise: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = toIstDateString(new Date(Date.now() - i * 86_400_000));
    const r = map.get(day);
    out.push({ day, bookings: Number(r?.bookings ?? 0), revenuePaise: Number(r?.revenue ?? 0) });
  }
  return out;
}

export async function getPopularRoutes() {
  const rows = await db.$queryRaw<{ origin: string; destination: string; bookings: bigint; seats: bigint }[]>(Prisma.sql`
    SELECT o.name AS origin, d.name AS destination, COUNT(b.id)::bigint AS bookings, COALESCE(SUM(b."seatCount"),0)::bigint AS seats
    FROM "Booking" b
    JOIN "Trip" t ON t.id = b."tripId"
    JOIN "Route" r ON r.id = t."routeId"
    JOIN "Location" o ON o.id = r."originId"
    JOIN "Location" d ON d.id = r."destinationId"
    WHERE b.status IN ('CONFIRMED','COMPLETED')
    GROUP BY o.name, d.name
    ORDER BY bookings DESC
    LIMIT 8`);
  return rows.map((r) => ({ label: `${r.origin} → ${r.destination}`, bookings: Number(r.bookings), seats: Number(r.seats) }));
}

export async function getBusinessMetrics() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const countType = (type: Prisma.AnalyticsEventWhereInput["type"]) => db.analyticsEvent.count({ where: { type, createdAt: { gte: since } } });
  const [searches, views, attempts, successes, cancels, activeDrivers, activePassengers, tripAgg, bookingAgg, seatsOffered, seatsSold] = await Promise.all([
    countType("SEARCH"),
    countType("RIDE_VIEW"),
    countType("BOOKING_ATTEMPT"),
    countType("BOOKING_SUCCESS"),
    countType("BOOKING_CANCELLED"),
    db.trip.groupBy({ by: ["driverId"], where: { departureAt: { gte: since } } }).then((r) => r.length),
    db.booking.groupBy({ by: ["userId"], where: { createdAt: { gte: since } } }).then((r) => r.length),
    db.trip.aggregate({ where: { status: { not: "CANCELLED" } }, _avg: { totalSeats: true }, _count: true }),
    db.booking.aggregate({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } }, _avg: { totalPaise: true, seatCount: true }, _sum: { seatCount: true } }),
    db.trip.aggregate({ where: { status: { in: ["COMPLETED", "SCHEDULED", "IN_PROGRESS"] } }, _sum: { totalSeats: true } }),
    db.booking.aggregate({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } }, _sum: { seatCount: true } }),
  ]);
  const offered = seatsOffered._sum.totalSeats ?? 0;
  const sold = seatsSold._sum.seatCount ?? 0;
  const bookingsPerTrip = tripAgg._count ? (bookingAgg._sum.seatCount ?? 0) / tripAgg._count : 0;
  return {
    funnel: [
      { label: "Searches", value: searches },
      { label: "Ride views", value: views },
      { label: "Booking attempts", value: attempts },
      { label: "Successful bookings", value: successes },
    ],
    cancels,
    conversionPct: searches ? Math.round((successes / searches) * 1000) / 10 : 0,
    activeDrivers,
    activePassengers,
    avgSeatsPerTrip: Math.round(bookingsPerTrip * 10) / 10,
    avgVehicleSeats: Math.round((tripAgg._avg.totalSeats ?? 0) * 10) / 10,
    avgBookingValuePaise: Math.round(bookingAgg._avg.totalPaise ?? 0),
    utilisationPct: offered ? Math.round((sold / offered) * 100) : 0,
  };
}
