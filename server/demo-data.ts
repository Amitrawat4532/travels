import "server-only";
import type { Location, Prisma, VehicleType } from "@prisma/client";
import { istToDate, toIstDateString } from "@/lib/format";
import type { RideDetail } from "./queries/rides";

/**
 * Built-in sample content for demo mode (no database). Shapes match the real
 * Prisma payloads exactly, so pages render it through the same code paths.
 * Clearly fictional: names are illustrative and nothing here can be booked.
 */

const EPOCH = new Date("2026-01-01T00:00:00Z");
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

const TOWNS: [string, string, number, number][] = [
  ["Dehradun", "Dehradun", 30.3165, 78.0322],
  ["Rishikesh", "Dehradun", 30.0869, 78.2676],
  ["Devprayag", "Tehri Garhwal", 30.1462, 78.598],
  ["Srinagar", "Pauri Garhwal", 30.2223, 78.7806],
  ["Rudraprayag", "Rudraprayag", 30.2844, 78.9811],
  ["Agastyamuni", "Rudraprayag", 30.3925, 79.0258],
  ["Guptkashi", "Rudraprayag", 30.5245, 79.079],
  ["Haridwar", "Haridwar", 29.9457, 78.1642],
  ["Gauchar", "Chamoli", 30.2864, 79.1534],
  ["Karnaprayag", "Chamoli", 30.2617, 79.217],
  ["Chamoli", "Chamoli", 30.4036, 79.321],
];

export const DEMO_LOCATIONS: Location[] = TOWNS.map(([name, district, latitude, longitude], i) => ({
  id: uuid(100 + i),
  name,
  slug: name.toLowerCase(),
  district,
  latitude,
  longitude,
  isActive: true,
  createdAt: EPOCH,
  updatedAt: EPOCH,
}));
const loc = (name: string) => DEMO_LOCATIONS.find((l) => l.name === name)!;

type StopDef = { name: string; km: number; min: number; fare: number; point: string };
type RouteDef = { from: string; to: string; km: number; min: number; fare: number; popular: boolean; boarding: string; drop: string; stops: StopDef[] };

const ROUTE_DEFS: RouteDef[] = [
  {
    from: "Dehradun", to: "Chamoli", km: 254, min: 500, fare: 900, popular: true,
    boarding: "ISBT Dehradun, Gate 2", drop: "Chamoli Bus Stand",
    stops: [
      { name: "Rishikesh", km: 45, min: 75, fare: 150, point: "Natraj Chowk, Rishikesh" },
      { name: "Devprayag", km: 115, min: 210, fare: 400, point: "Devprayag Taxi Stand" },
      { name: "Srinagar", km: 150, min: 285, fare: 520, point: "Srinagar Bus Adda" },
      { name: "Rudraprayag", km: 183, min: 360, fare: 650, point: "Rudraprayag Bus Stand" },
      { name: "Gauchar", km: 203, min: 400, fare: 720, point: "Gauchar Market" },
      { name: "Karnaprayag", km: 214, min: 425, fare: 760, point: "Karnaprayag Sangam Bazaar" },
    ],
  },
  {
    from: "Chamoli", to: "Dehradun", km: 254, min: 500, fare: 900, popular: true,
    boarding: "Chamoli Bus Stand", drop: "ISBT Dehradun",
    stops: [
      { name: "Karnaprayag", km: 40, min: 75, fare: 150, point: "Karnaprayag Sangam Bazaar" },
      { name: "Gauchar", km: 51, min: 100, fare: 190, point: "Gauchar Market" },
      { name: "Rudraprayag", km: 71, min: 140, fare: 260, point: "Rudraprayag Bus Stand" },
      { name: "Srinagar", km: 104, min: 215, fare: 400, point: "Srinagar Bus Adda" },
      { name: "Devprayag", km: 139, min: 290, fare: 520, point: "Devprayag Taxi Stand" },
      { name: "Rishikesh", km: 209, min: 425, fare: 760, point: "Natraj Chowk, Rishikesh" },
    ],
  },
  {
    from: "Dehradun", to: "Rudraprayag", km: 183, min: 360, fare: 650, popular: true,
    boarding: "ISBT Dehradun, Gate 2", drop: "Rudraprayag Bus Stand",
    stops: [
      { name: "Rishikesh", km: 45, min: 75, fare: 150, point: "Natraj Chowk, Rishikesh" },
      { name: "Devprayag", km: 115, min: 210, fare: 400, point: "Devprayag Taxi Stand" },
      { name: "Srinagar", km: 150, min: 285, fare: 520, point: "Srinagar Bus Adda" },
    ],
  },
  {
    from: "Rudraprayag", to: "Dehradun", km: 183, min: 360, fare: 650, popular: true,
    boarding: "Rudraprayag Bus Stand", drop: "ISBT Dehradun",
    stops: [
      { name: "Srinagar", km: 33, min: 70, fare: 150, point: "Srinagar Bus Adda" },
      { name: "Devprayag", km: 68, min: 150, fare: 270, point: "Devprayag Taxi Stand" },
      { name: "Rishikesh", km: 138, min: 285, fare: 520, point: "Natraj Chowk, Rishikesh" },
    ],
  },
  {
    from: "Dehradun", to: "Srinagar", km: 150, min: 290, fare: 520, popular: true,
    boarding: "Clock Tower (Ghanta Ghar)", drop: "Srinagar Bus Adda",
    stops: [
      { name: "Rishikesh", km: 45, min: 75, fare: 150, point: "Natraj Chowk, Rishikesh" },
      { name: "Devprayag", km: 115, min: 210, fare: 400, point: "Devprayag Taxi Stand" },
    ],
  },
  {
    from: "Srinagar", to: "Dehradun", km: 150, min: 290, fare: 520, popular: false,
    boarding: "Srinagar Bus Adda", drop: "Clock Tower (Ghanta Ghar)",
    stops: [
      { name: "Devprayag", km: 35, min: 80, fare: 140, point: "Devprayag Taxi Stand" },
      { name: "Rishikesh", km: 105, min: 215, fare: 380, point: "Natraj Chowk, Rishikesh" },
    ],
  },
];

export type DemoRoute = Prisma.RouteGetPayload<{
  include: { origin: true; destination: true; stops: { include: { location: true } } };
}>;

export const DEMO_ROUTES: DemoRoute[] = ROUTE_DEFS.map((r, i) => {
  const id = uuid(200 + i);
  const origin = loc(r.from);
  const destination = loc(r.to);
  return {
    id,
    slug: `${origin.slug}-to-${destination.slug}`,
    originId: origin.id,
    destinationId: destination.id,
    distanceKm: r.km,
    durationMinutes: r.min,
    suggestedFarePaise: r.fare * 100,
    isActive: true,
    isPopular: r.popular,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    origin,
    destination,
    stops: r.stops.map((s, j) => ({
      id: uuid(300 + i * 10 + j),
      routeId: id,
      locationId: loc(s.name).id,
      sequence: j + 1,
      distanceFromOriginKm: s.km,
      minutesFromOrigin: s.min,
      location: loc(s.name),
    })),
  };
});

const DRIVERS = [
  { name: "Ramesh Singh Negi", years: 14, langs: "Hindi, Garhwali", rating: 4.9, count: 128, trips: 412 },
  { name: "Mahendra Rawat", years: 11, langs: "Hindi, Garhwali, English", rating: 4.8, count: 96, trips: 305 },
  { name: "Sunil Bisht", years: 8, langs: "Hindi, Garhwali", rating: 4.7, count: 64, trips: 188 },
  { name: "Govind Semwal", years: 17, langs: "Hindi, Garhwali", rating: 4.9, count: 151, trips: 520 },
  { name: "Dinesh Chauhan", years: 9, langs: "Hindi, Garhwali", rating: 4.6, count: 41, trips: 133 },
];

const VEHICLES: { type: VehicleType; model: string; seats: number; reg: string; color: string; ac: boolean }[] = [
  { type: "BOLERO", model: "Mahindra Bolero Neo", seats: 8, reg: "UK07TA4521", color: "White", ac: false },
  { type: "SUMO", model: "Tata Sumo Gold", seats: 9, reg: "UK13PA2210", color: "Silver", ac: false },
  { type: "INNOVA", model: "Toyota Innova Crysta", seats: 7, reg: "UK07TC9931", color: "Grey", ac: true },
  { type: "TEMPO_TRAVELLER", model: "Force Tempo Traveller", seats: 12, reg: "UK14TB6322", color: "White", ac: true },
  { type: "ERTIGA", model: "Maruti Ertiga", seats: 6, reg: "UK12TA5103", color: "Silver", ac: true },
];

const REVIEWS = [
  "Driver bhaiya ne time pe pick kiya, gaadi saaf thi. Pahadi raste pe bahut safe driving.",
  "Bahut acchi service. Srinagar mein exact jagah drop kiya.",
  "On time departure from ISBT. Will book again for Diwali.",
  "Very polite driver, stopped at Devprayag for tea. Recommended!",
];

const SLOTS: [number, number, string][] = [
  // [routeIndex, dayOffset, "HH:mm"] — 0/1 Chamoli, 2/3 Rudraprayag, 4/5 Srinagar
  [0, 0, "14:30"], [0, 1, "05:30"], [0, 1, "07:00"], [0, 2, "05:30"], [0, 3, "06:00"], [0, 5, "05:30"],
  [1, 1, "06:00"], [1, 1, "07:30"], [1, 2, "06:00"], [1, 4, "06:30"],
  [2, 0, "15:30"], [2, 1, "06:00"], [2, 2, "06:30"], [2, 4, "07:00"],
  [3, 1, "07:30"], [3, 3, "08:00"],
  [4, 1, "08:30"], [4, 2, "07:00"],
  [5, 1, "09:00"], [5, 3, "08:00"],
];

function withoutStops({ stops, ...rest }: DemoRoute) {
  void stops;
  return rest;
}

/** Sample trips, dated relative to today (IST) so the demo always looks current. */
export function demoTrips(now = new Date()): RideDetail[] {
  const today = toIstDateString(now);
  return SLOTS.map(([ri, day, time], n) => {
    const def = ROUTE_DEFS[ri]!;
    const route = DEMO_ROUTES[ri]!;
    const d = DRIVERS[n % DRIVERS.length]!;
    const v = VEHICLES[n % VEHICLES.length]!;
    const id = uuid(1000 + n);
    const date = toIstDateString(new Date(istToDate(today, "12:00").getTime() + day * 86_400_000));
    const departureAt = istToDate(date, time);
    const arrival = new Date(departureAt.getTime() + def.min * 60_000);
    const booked = [2, 5, 3, 1, 4, 6, 2][n % 7]!;
    const stopsDef = [
      { name: def.from, min: 0, fare: 0, point: def.boarding },
      ...def.stops,
      { name: def.to, min: def.min, fare: def.fare, point: def.drop },
    ];
    const stops = stopsDef.map((s, j) => ({
      id: uuid(5000 + n * 10 + j),
      tripId: id,
      locationId: loc(s.name).id,
      sequence: j,
      pointName: s.point,
      scheduledAt: new Date(departureAt.getTime() + s.min * 60_000),
      fareFromOriginPaise: s.fare * 100,
      location: loc(s.name),
    }));
    const seats = Array.from({ length: v.seats }, (_, k) => ({
      seatNumber: k + 1,
      status: (k < Math.min(booked, v.seats - 1) ? "BOOKED" : "AVAILABLE") as "BOOKED" | "AVAILABLE",
    }));
    const available = seats.filter((s) => s.status === "AVAILABLE").length;
    return {
      id,
      driverId: uuid(400 + (n % DRIVERS.length)),
      vehicleId: uuid(450 + (n % VEHICLES.length)),
      routeId: route.id,
      departureAt,
      estimatedArrivalAt: arrival,
      totalSeats: v.seats,
      pricePerSeatPaise: def.fare * 100,
      boardingPoint: def.boarding,
      dropPoint: def.drop,
      notes: n % 3 === 0 ? "Roof carrier available for luggage. Tea break at Devprayag." : null,
      cancellationHours: 6,
      status: "SCHEDULED" as const,
      cancelReason: null,
      cancelledAt: null,
      startedAt: null,
      completedAt: null,
      reminderSentAt: null,
      isSeedData: true,
      createdAt: EPOCH,
      updatedAt: EPOCH,
      route: withoutStops(route),
      vehicle: { type: v.type, model: v.model, registrationNumber: v.reg, isAc: v.ac, hasCarrier: v.type !== "INNOVA", color: v.color },
      stops,
      seats,
      _count: { seats: available },
      driver: {
        id: uuid(400 + (n % DRIVERS.length)),
        status: "VERIFIED" as const,
        ratingAvg: d.rating,
        ratingCount: d.count,
        completedTrips: d.trips,
        yearsExperience: d.years,
        languages: d.langs,
        bio: `${d.years} saal se pahadi routes pe gaadi chala raha hoon. Time ka paaband, safe driving.`,
        verifiedAt: EPOCH,
        user: { name: d.name, avatarKey: null, createdAt: EPOCH },
        reviews: REVIEWS.slice(0, 3).map((comment, k) => ({
          id: uuid(9000 + n * 10 + k),
          rating: k === 2 ? 4 : 5,
          comment: REVIEWS[(n + k) % REVIEWS.length] ?? comment,
          createdAt: new Date(now.getTime() - (k + 2) * 86_400_000),
          user: { name: ["Amit Rawat", "Pooja Negi", "Rahul Bhatt"][k]! },
        })),
      },
    };
  });
}
