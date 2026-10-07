import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { BOOKING_CUTOFF_MINUTES } from "@/lib/constants";
import { istDayRange } from "@/lib/format";
import { segmentFarePaise } from "@/server/services/bookings";
import { withDemo } from "@/server/demo";
import { DEMO_LOCATIONS, DEMO_ROUTES, demoTrips } from "@/server/demo-data";

export async function getActiveLocations() {
  return withDemo(
    () =>
      db.location.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, district: true },
      }),
    () =>
      [...DEMO_LOCATIONS]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ id, name, slug, district }) => ({ id, name, slug, district })),
  );
}

export async function getLocationBySlugOrName(value: string | undefined) {
  if (!value) return null;
  const v = value.toLowerCase();
  return withDemo(() => findLocation(value), () => DEMO_LOCATIONS.find((l) => l.slug === v || l.name.toLowerCase() === v) ?? null);
}

function findLocation(value: string) {
  return db.location.findFirst({
    where: {
      isActive: true,
      OR: [{ slug: value.toLowerCase() }, { name: { equals: value, mode: "insensitive" } }],
    },
  });
}

const rideCardInclude = {
  route: { include: { origin: true, destination: true } },
  vehicle: { select: { type: true, model: true, registrationNumber: true, isAc: true, hasCarrier: true, color: true } },
  driver: {
    select: {
      id: true,
      status: true,
      ratingAvg: true,
      ratingCount: true,
      completedTrips: true,
      user: { select: { name: true, avatarKey: true } },
    },
  },
  stops: { include: { location: true }, orderBy: { sequence: "asc" } },
  _count: { select: { seats: { where: { status: "AVAILABLE" } } } },
} satisfies Prisma.TripInclude;

type RideRow = Prisma.TripGetPayload<{ include: typeof rideCardInclude }>;

export type RideSummary = {
  id: string;
  departureAt: Date;
  arrivalAt: Date;
  /** Stop where this passenger boards / gets down (segment-aware). */
  boarding: { id: string; name: string; point: string; at: Date };
  drop: { id: string; name: string; point: string; at: Date };
  routeOrigin: string;
  routeDestination: string;
  intermediateStops: string[];
  totalSeats: number;
  availableSeats: number;
  farePaise: number;
  cancellationHours: number;
  vehicle: RideRow["vehicle"];
  driver: {
    id: string;
    name: string;
    avatarKey: string | null;
    verified: boolean;
    ratingAvg: number;
    ratingCount: number;
    completedTrips: number;
  };
};

function toSummary(trip: RideRow, fromLocationId?: string, toLocationId?: string): RideSummary | null {
  const stops = trip.stops;
  const boarding = fromLocationId ? stops.find((s) => s.locationId === fromLocationId) : stops[0];
  const drop = toLocationId ? stops.find((s) => s.locationId === toLocationId) : stops[stops.length - 1];
  if (!boarding || !drop || boarding.sequence >= drop.sequence) return null;
  return {
    id: trip.id,
    departureAt: trip.departureAt,
    arrivalAt: trip.estimatedArrivalAt,
    boarding: { id: boarding.id, name: boarding.location.name, point: boarding.pointName, at: boarding.scheduledAt },
    drop: { id: drop.id, name: drop.location.name, point: drop.pointName, at: drop.scheduledAt },
    routeOrigin: trip.route.origin.name,
    routeDestination: trip.route.destination.name,
    intermediateStops: stops.filter((s) => s.sequence > boarding.sequence && s.sequence < drop.sequence).map((s) => s.location.name),
    totalSeats: trip.totalSeats,
    availableSeats: trip._count.seats,
    farePaise: segmentFarePaise(boarding, drop),
    cancellationHours: trip.cancellationHours,
    vehicle: trip.vehicle,
    driver: {
      id: trip.driver.id,
      name: trip.driver.user.name,
      avatarKey: trip.driver.user.avatarKey,
      verified: trip.driver.status === "VERIFIED",
      ratingAvg: trip.driver.ratingAvg,
      ratingCount: trip.driver.ratingCount,
      completedTrips: trip.driver.completedTrips,
    },
  };
}

export type SearchResult = {
  rides: RideSummary[];
  soldOut: RideSummary[];
  from: { id: string; name: string; slug: string } | null;
  to: { id: string; name: string; slug: string } | null;
  date?: string;
};

/**
 * Find bookable trips that pass through `from` and later through `to`.
 * A Dehradun → Rudraprayag trip therefore also answers Dehradun → Srinagar.
 */
export async function searchRides(params: {
  from?: string;
  to?: string;
  date?: string;
  passengers: number;
}): Promise<SearchResult> {
  const [from, to] = await Promise.all([
    getLocationBySlugOrName(params.from),
    getLocationBySlugOrName(params.to),
  ]);
  if (!from || !to || from.id === to.id) return { rides: [], soldOut: [], from, to, date: params.date };

  const earliest = new Date(Date.now() + BOOKING_CUTOFF_MINUTES * 60_000);
  let departureFilter: Prisma.DateTimeFilter = { gt: earliest, lt: new Date(Date.now() + 14 * 86_400_000) };
  if (params.date) {
    const { start, end } = istDayRange(params.date);
    departureFilter = { gte: start > earliest ? start : earliest, lt: end };
  }

  const trips: RideRow[] = await withDemo(
    () =>
      db.trip.findMany({
        where: {
          status: "SCHEDULED",
          departureAt: departureFilter,
          driver: { status: "VERIFIED", user: { status: "ACTIVE" } },
          AND: [{ stops: { some: { locationId: from.id } } }, { stops: { some: { locationId: to.id } } }],
        },
        include: rideCardInclude,
        orderBy: { departureAt: "asc" },
        take: 60,
      }),
    () => demoTripsMatching(from.id, to.id, departureFilter),
  );

  const summaries = trips
    .map((t) => toSummary(t, from.id, to.id))
    .filter((s): s is RideSummary => s !== null);

  return {
    rides: summaries.filter((s) => s.availableSeats >= params.passengers),
    soldOut: summaries.filter((s) => s.availableSeats < params.passengers),
    from,
    to,
    date: params.date,
  };
}

export async function getUpcomingRidesForRoute(originId: string, destinationId: string, take = 6) {
  const after = new Date(Date.now() + BOOKING_CUTOFF_MINUTES * 60_000);
  const trips: RideRow[] = await withDemo(
    () =>
      db.trip.findMany({
        where: {
          status: "SCHEDULED",
          departureAt: { gt: after },
          driver: { status: "VERIFIED", user: { status: "ACTIVE" } },
          AND: [{ stops: { some: { locationId: originId } } }, { stops: { some: { locationId: destinationId } } }],
        },
        include: rideCardInclude,
        orderBy: { departureAt: "asc" },
        take: take * 2,
      }),
    () => demoTripsMatching(originId, destinationId, { gt: after }),
  );
  return trips
    .map((t) => toSummary(t, originId, destinationId))
    .filter((s): s is RideSummary => s !== null && s.availableSeats > 0)
    .slice(0, take);
}

/** Full ride detail for the public ride page (no passenger PII). */
export async function getRideDetail(tripId: string): Promise<RideDetail | null> {
  return withDemo(() => findRideDetail(tripId), () => demoTrips().find((t) => t.id === tripId) ?? null);
}

function findRideDetail(tripId: string) {
  return db.trip.findUnique({
    where: { id: tripId },
    include: {
      ...rideCardInclude,
      seats: { select: { seatNumber: true, status: true }, orderBy: { seatNumber: "asc" } },
      driver: {
        select: {
          id: true,
          status: true,
          ratingAvg: true,
          ratingCount: true,
          completedTrips: true,
          yearsExperience: true,
          languages: true,
          bio: true,
          verifiedAt: true,
          user: { select: { name: true, avatarKey: true, createdAt: true } },
          reviews: {
            where: { isHidden: false },
            orderBy: { createdAt: "desc" },
            take: 6,
            select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { name: true } } },
          },
        },
      },
    },
  });
}

export type RideDetail = NonNullable<Awaited<ReturnType<typeof findRideDetail>>>;

export async function getPopularRoutes() {
  return withDemo(
    () =>
      db.route.findMany({
        where: { isActive: true },
        orderBy: [{ isPopular: "desc" }, { createdAt: "asc" }],
        include: { origin: true, destination: true, stops: { include: { location: true }, orderBy: { sequence: "asc" } } },
        take: 8,
      }),
    () => [...DEMO_ROUTES].sort((a, b) => Number(b.isPopular) - Number(a.isPopular)),
  );
}

export async function getRouteBySlug(slug: string) {
  return withDemo(
    () =>
      db.route.findFirst({
        where: { slug, isActive: true },
        include: { origin: true, destination: true, stops: { include: { location: true }, orderBy: { sequence: "asc" } } },
      }),
    () => DEMO_ROUTES.find((r) => r.slug === slug) ?? null,
  );
}

/** Demo-mode equivalent of the trip search query. */
function demoTripsMatching(fromId: string, toId: string, when: Prisma.DateTimeFilter): RideRow[] {
  const gt = when.gt instanceof Date ? when.gt : undefined;
  const gte = when.gte instanceof Date ? when.gte : undefined;
  const lt = when.lt instanceof Date ? when.lt : undefined;
  return demoTrips()
    .filter((t) => (!gt || t.departureAt > gt) && (!gte || t.departureAt >= gte) && (!lt || t.departureAt < lt))
    .filter((t) => t.stops.some((s) => s.locationId === fromId) && t.stops.some((s) => s.locationId === toId))
    .sort((a, b) => a.departureAt.getTime() - b.departureAt.getTime());
}
