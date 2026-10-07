import "server-only";
import type { BookingStatus, Prisma } from "@prisma/client";
import { db } from "@/server/db";

export const bookingListInclude = {
  trip: {
    select: {
      id: true,
      departureAt: true,
      status: true,
      vehicle: { select: { model: true, type: true, registrationNumber: true } },
      driver: { select: { id: true, ratingAvg: true, ratingCount: true, user: { select: { name: true, avatarKey: true, phone: true } } } },
    },
  },
  boardingStop: { include: { location: true } },
  dropStop: { include: { location: true } },
  review: { select: { rating: true } },
} satisfies Prisma.BookingInclude;

export type BookingListItem = Prisma.BookingGetPayload<{ include: typeof bookingListInclude }>;

const ACTIVE: BookingStatus[] = ["PENDING", "CONFIRMED"];

export async function getPassengerBookings(userId: string, scope: "upcoming" | "past" | "all") {
  const now = new Date();
  const where: Prisma.BookingWhereInput =
    scope === "upcoming"
      ? { userId, status: { in: ACTIVE }, trip: { departureAt: { gt: new Date(now.getTime() - 12 * 3_600_000) }, status: { in: ["SCHEDULED", "IN_PROGRESS"] } } }
      : scope === "past"
        ? { userId, OR: [{ status: { notIn: ACTIVE } }, { trip: { status: { in: ["COMPLETED", "CANCELLED"] } } }] }
        : { userId };
  return db.booking.findMany({
    where,
    include: bookingListInclude,
    orderBy: scope === "upcoming" ? { trip: { departureAt: "asc" } } : { trip: { departureAt: "desc" } },
    take: 100,
  });
}

/** A passenger's own booking with everything needed for the ticket page. */
export async function getPassengerBooking(userId: string, bookingId: string) {
  return db.booking.findFirst({
    where: { id: bookingId, userId },
    include: {
      passengers: { orderBy: { seatNumber: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      review: true,
      boardingStop: { include: { location: true } },
      dropStop: { include: { location: true } },
      trip: {
        include: {
          route: { include: { origin: true, destination: true } },
          vehicle: true,
          stops: { include: { location: true }, orderBy: { sequence: "asc" } },
          driver: {
            select: {
              id: true,
              status: true,
              ratingAvg: true,
              ratingCount: true,
              completedTrips: true,
              user: { select: { name: true, phone: true, avatarKey: true } },
            },
          },
        },
      },
    },
  });
}

export async function getPassengerStats(userId: string) {
  const [completed, upcoming, spent, saved] = await Promise.all([
    db.booking.count({ where: { userId, status: "COMPLETED" } }),
    db.booking.count({ where: { userId, status: { in: ACTIVE }, trip: { departureAt: { gt: new Date() } } } }),
    db.booking.aggregate({ where: { userId, status: "COMPLETED" }, _sum: { totalPaise: true } }),
    db.savedRoute.count({ where: { userId } }),
  ]);
  return { completed, upcoming, spentPaise: spent._sum.totalPaise ?? 0, saved };
}
