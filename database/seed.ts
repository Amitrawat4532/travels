/**
 * Development seed data — clearly marked with isSeedData = true.
 *
 *   npm run db:seed
 *
 * Creates locations, 4 launch routes, 10 drivers (+ driver@demo.com),
 * 20 vehicles, 50 passengers (+ passenger@demo.com), 20 trips, bookings and
 * reviews, and admin@demo.com. All demo accounts share DEMO_PASSWORD.
 *
 * Demo accounts are NOT created when NODE_ENV=production unless
 * SEED_DEMO_ACCOUNTS=true is set explicitly.
 */
import { PrismaClient, type VehicleType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const db = new PrismaClient();

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Pahadi@2026";
const PLATFORM_FEE = 2000;

// Deterministic PRNG so every developer gets the same data.
let state = 20261007;
function rand(): number {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
}
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** IST wall-clock → UTC Date, relative to today. */
function istAt(daysFromToday: number, hh: number, mm = 0): Date {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate() + daysFromToday;
  return new Date(Date.UTC(y, m, d, hh, mm) - 5.5 * 3600_000);
}

const LOCATIONS = [
  { name: "Dehradun", district: "Dehradun", latitude: 30.3165, longitude: 78.0322 },
  { name: "Rishikesh", district: "Dehradun", latitude: 30.0869, longitude: 78.2676 },
  { name: "Devprayag", district: "Tehri Garhwal", latitude: 30.1462, longitude: 78.598 },
  { name: "Srinagar", district: "Pauri Garhwal", latitude: 30.2223, longitude: 78.7806 },
  { name: "Rudraprayag", district: "Rudraprayag", latitude: 30.2844, longitude: 78.9811 },
  { name: "Agastyamuni", district: "Rudraprayag", latitude: 30.3925, longitude: 79.0258 },
  { name: "Ukhimath", district: "Rudraprayag", latitude: 30.5207, longitude: 79.0954 },
  { name: "Guptkashi", district: "Rudraprayag", latitude: 30.5245, longitude: 79.079 },
  { name: "Haridwar", district: "Haridwar", latitude: 29.9457, longitude: 78.1642 },
  { name: "Kirtinagar", district: "Tehri Garhwal", latitude: 30.2115, longitude: 78.7455 },
];

type StopDef = { name: string; km: number; min: number; fare: number; point: string };
type RouteDef = {
  from: string;
  to: string;
  km: number;
  min: number;
  fare: number;
  popular: boolean;
  boarding: string[];
  drop: string[];
  stops: StopDef[];
};

const ROUTES: RouteDef[] = [
  {
    from: "Dehradun", to: "Rudraprayag", km: 183, min: 360, fare: 650, popular: true,
    boarding: ["ISBT Dehradun, Gate 2", "Clock Tower (Ghanta Ghar)", "Jogiwala Chowk"],
    drop: ["Rudraprayag Bus Stand", "Gulabrai, Rudraprayag", "Sangam Bazaar, Rudraprayag"],
    stops: [
      { name: "Rishikesh", km: 45, min: 75, fare: 150, point: "Natraj Chowk, Rishikesh" },
      { name: "Devprayag", km: 115, min: 210, fare: 400, point: "Devprayag Taxi Stand" },
      { name: "Srinagar", km: 150, min: 285, fare: 520, point: "Srinagar Bus Adda" },
    ],
  },
  {
    from: "Rudraprayag", to: "Dehradun", km: 183, min: 360, fare: 650, popular: true,
    boarding: ["Rudraprayag Bus Stand", "Gulabrai, Rudraprayag"],
    drop: ["ISBT Dehradun", "Clock Tower (Ghanta Ghar)", "Jogiwala Chowk"],
    stops: [
      { name: "Srinagar", km: 33, min: 70, fare: 150, point: "Srinagar Bus Adda" },
      { name: "Devprayag", km: 68, min: 150, fare: 270, point: "Devprayag Taxi Stand" },
      { name: "Rishikesh", km: 138, min: 285, fare: 520, point: "Natraj Chowk, Rishikesh" },
    ],
  },
  {
    from: "Dehradun", to: "Srinagar", km: 150, min: 290, fare: 520, popular: true,
    boarding: ["ISBT Dehradun, Gate 2", "Clock Tower (Ghanta Ghar)"],
    drop: ["Srinagar Bus Adda", "HNB Garhwal University Gate, Srinagar"],
    stops: [
      { name: "Rishikesh", km: 45, min: 75, fare: 150, point: "Natraj Chowk, Rishikesh" },
      { name: "Devprayag", km: 115, min: 210, fare: 400, point: "Devprayag Taxi Stand" },
    ],
  },
  {
    from: "Srinagar", to: "Dehradun", km: 150, min: 290, fare: 520, popular: false,
    boarding: ["Srinagar Bus Adda", "HNB Garhwal University Gate, Srinagar"],
    drop: ["ISBT Dehradun", "Clock Tower (Ghanta Ghar)"],
    stops: [
      { name: "Devprayag", km: 35, min: 80, fare: 140, point: "Devprayag Taxi Stand" },
      { name: "Rishikesh", km: 105, min: 215, fare: 380, point: "Natraj Chowk, Rishikesh" },
    ],
  },
];

const DRIVERS = [
  { name: "Ramesh Singh Negi", email: "driver@demo.com", phone: "9837012345", base: "Rudraprayag", years: 14, langs: "Hindi, Garhwali" },
  { name: "Mahendra Rawat", email: "mahendra.rawat@seed.pahadiseat.in", phone: "9412011223", base: "Dehradun", years: 11, langs: "Hindi, Garhwali, English" },
  { name: "Sunil Bisht", email: "sunil.bisht@seed.pahadiseat.in", phone: "9759022334", base: "Srinagar", years: 8, langs: "Hindi, Garhwali" },
  { name: "Govind Semwal", email: "govind.semwal@seed.pahadiseat.in", phone: "9997033445", base: "Rudraprayag", years: 17, langs: "Hindi, Garhwali" },
  { name: "Prakash Bhatt", email: "prakash.bhatt@seed.pahadiseat.in", phone: "8126044556", base: "Dehradun", years: 6, langs: "Hindi, English" },
  { name: "Dinesh Chauhan", email: "dinesh.chauhan@seed.pahadiseat.in", phone: "9568055667", base: "Rishikesh", years: 9, langs: "Hindi, Garhwali" },
  { name: "Rajendra Panwar", email: "rajendra.panwar@seed.pahadiseat.in", phone: "7579066778", base: "Srinagar", years: 12, langs: "Hindi, Garhwali" },
  { name: "Vinod Nautiyal", email: "vinod.nautiyal@seed.pahadiseat.in", phone: "9412077889", base: "Rudraprayag", years: 20, langs: "Hindi, Garhwali, Kumaoni" },
  { name: "Kuldeep Rana", email: "kuldeep.rana@seed.pahadiseat.in", phone: "8755088990", base: "Dehradun", years: 4, langs: "Hindi, English" },
  { name: "Harish Kandari", email: "harish.kandari@seed.pahadiseat.in", phone: "9634099001", base: "Rudraprayag", years: 7, langs: "Hindi, Garhwali" },
];

const VEHICLE_MODELS: { type: VehicleType; model: string; seats: number }[] = [
  { type: "BOLERO", model: "Mahindra Bolero Neo", seats: 8 },
  { type: "SUMO", model: "Tata Sumo Gold", seats: 9 },
  { type: "ERTIGA", model: "Maruti Ertiga", seats: 6 },
  { type: "INNOVA", model: "Toyota Innova Crysta", seats: 7 },
  { type: "TEMPO_TRAVELLER", model: "Force Tempo Traveller", seats: 12 },
  { type: "SUV", model: "Mahindra Scorpio", seats: 6 },
  { type: "BOLERO", model: "Mahindra Bolero Camper", seats: 8 },
];
const COLORS = ["White", "Silver", "Grey", "Diamond White", "Mist Silver", "Red"];

const FIRST = ["Amit", "Pooja", "Rahul", "Neha", "Saurabh", "Kavita", "Ankit", "Priyanka", "Deepak", "Sapna", "Manish", "Ritu", "Vikas", "Anjali", "Pankaj", "Meenakshi", "Rohit", "Sneha", "Ajay", "Komal", "Gaurav", "Swati", "Naveen", "Bhawna", "Tarun"];
const LAST = ["Rawat", "Negi", "Bisht", "Semwal", "Bhatt", "Chauhan", "Panwar", "Nautiyal", "Rana", "Kandari", "Thapliyal", "Dobhal", "Uniyal", "Joshi", "Gusain", "Butola", "Pundir", "Dhyani"];
const REVIEW_TEXT = [
  "Driver bhaiya ne time pe pick kiya, gaadi saaf thi. Pahadi raste pe bahut safe driving.",
  "Bahut acchi service. Srinagar mein exact jagah drop kiya.",
  "On time departure from ISBT. Will book again for Diwali.",
  "Smooth ride, luggage carrier pe bag achhe se baandha.",
  "Good experience overall. Thoda late chale but call karke bata diya tha.",
  "Very polite driver, stopped at Devprayag for tea. Recommended!",
  "Safe driving in the rain near Kirtinagar. Thank you.",
  null,
];

// A tiny valid PDF used as the placeholder for every seeded document.
const SAMPLE_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 420 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 74>>stream
BT /F1 18 Tf 40 110 Td (SEED / TEST DOCUMENT - not a real licence) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

async function main() {
  const isProd = process.env.NODE_ENV === "production";
  const withDemo = !isProd || process.env.SEED_DEMO_ACCOUNTS === "true";
  console.log(`🌱 Seeding (demo accounts: ${withDemo ? "yes" : "no"})`);

  // Wipe in dependency order (dev only).
  if (isProd && process.env.SEED_ALLOW_WIPE !== "true") {
    throw new Error("Refusing to wipe a production database. Set SEED_ALLOW_WIPE=true if you really mean it.");
  }
  await db.$transaction([
    db.analyticsEvent.deleteMany(),
    db.adminAction.deleteMany(),
    db.notification.deleteMany(),
    db.complaint.deleteMany(),
    db.review.deleteMany(),
    db.payment.deleteMany(),
    db.tripSeat.deleteMany(),
    db.bookingPassenger.deleteMany(),
    db.booking.deleteMany(),
    db.tripStop.deleteMany(),
    db.trip.deleteMany(),
    db.driverDocument.deleteMany(),
    db.vehicle.deleteMany(),
    db.driverProfile.deleteMany(),
    db.passengerProfile.deleteMany(),
    db.rideAlert.deleteMany(),
    db.savedRoute.deleteMany(),
    db.session.deleteMany(),
    db.user.deleteMany(),
    db.routeStop.deleteMany(),
    db.route.deleteMany(),
    db.location.deleteMany(),
  ]);

  const storageDir = path.resolve(process.env.STORAGE_DIR ?? "./storage");
  await mkdir(path.join(storageDir, "seed"), { recursive: true });
  await writeFile(path.join(storageDir, "seed", "sample-document.pdf"), SAMPLE_PDF);
  const SAMPLE_KEY = "seed/sample-document.pdf";

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Locations
  const loc: Record<string, { id: string; slug: string }> = {};
  for (const l of LOCATIONS) {
    const created = await db.location.create({ data: { ...l, slug: slug(l.name) } });
    loc[l.name] = created;
  }

  // Routes
  const routes: { id: string; def: RouteDef }[] = [];
  for (const r of ROUTES) {
    const route = await db.route.create({
      data: {
        slug: `${slug(r.from)}-to-${slug(r.to)}`,
        originId: loc[r.from]!.id,
        destinationId: loc[r.to]!.id,
        distanceKm: r.km,
        durationMinutes: r.min,
        suggestedFarePaise: r.fare * 100,
        isPopular: r.popular,
        stops: {
          create: r.stops.map((s, i) => ({
            locationId: loc[s.name]!.id,
            sequence: i + 1,
            distanceFromOriginKm: s.km,
            minutesFromOrigin: s.min,
          })),
        },
      },
    });
    routes.push({ id: route.id, def: r });
  }

  // Admin
  if (withDemo) {
    await db.user.create({
      data: { name: "Platform Admin", email: "admin@demo.com", phone: "9000000001", passwordHash, role: "ADMIN", isSeedData: true },
    });
  }

  // Passengers (50 incl. demo)
  const passengers: { id: string; name: string; phone: string }[] = [];
  const usedPhones = new Set<string>(DRIVERS.map((d) => d.phone));
  for (let i = 0; i < 50; i++) {
    const isDemo = i === 0 && withDemo;
    const name = isDemo ? "Amit Rawat" : `${pick(FIRST)} ${pick(LAST)}`;
    let phone = isDemo ? "9876543210" : `${pick(["98", "97", "96", "94", "88", "81", "75", "70"])}${int(10000000, 99999999)}`;
    while (usedPhones.has(phone)) phone = `9${int(100000000, 999999999)}`;
    usedPhones.add(phone);
    const email = isDemo ? "passenger@demo.com" : `${slug(name).replace(/-/g, ".")}${i}@seed.pahadiseat.in`;
    const u = await db.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role: "PASSENGER",
        isSeedData: true,
        createdAt: istAt(-int(5, 90), int(8, 21)),
        passengerProfile: { create: { homeLocationId: loc[pick(["Dehradun", "Rudraprayag", "Srinagar", "Rishikesh"])]!.id } },
      },
    });
    passengers.push({ id: u.id, name: u.name, phone: u.phone });
  }

  // Drivers + vehicles (20) + documents
  type SeedDriver = { profileId: string; userId: string; vehicles: { id: string; seats: number; type: VehicleType }[] };
  const drivers: SeedDriver[] = [];
  for (let i = 0; i < DRIVERS.length; i++) {
    const d = DRIVERS[i]!;
    if (!withDemo && d.email.endsWith("@demo.com")) continue;
    // Driver #9 is pending review and #10 was rejected — so the admin queue has work.
    const status = i === 8 ? "PENDING" : i === 9 ? "REJECTED" : "VERIFIED";
    const user = await db.user.create({
      data: {
        name: d.name,
        email: d.email,
        phone: d.phone,
        passwordHash,
        role: "DRIVER",
        isSeedData: true,
        createdAt: istAt(-int(60, 200), 10),
      },
    });
    const profile = await db.driverProfile.create({
      data: {
        userId: user.id,
        status,
        licenceNumber: `UK${String(int(1, 14)).padStart(2, "0")}20${int(10, 20)}00${int(10000, 99999)}`,
        licenceExpiry: istAt(365 * int(2, 8), 0),
        permitNumber: `UK-CC-${int(1000, 9999)}/${int(2019, 2025)}`,
        permitDetails: "All-Uttarakhand contract carriage permit",
        yearsExperience: d.years,
        languages: d.langs,
        bio: `${d.years} saal se pahadi routes pe gaadi chala raha hoon. Time ka paaband, safe driving.`,
        baseLocationId: loc[d.base]!.id,
        submittedAt: istAt(-int(30, 150), 11),
        verifiedAt: status === "VERIFIED" ? istAt(-int(20, 140), 12) : null,
        rejectionReason: status === "REJECTED" ? "Driving licence photo is not readable. Please upload a clear copy." : null,
      },
    });
    for (const doc of [{ type: "DRIVING_LICENCE" as const }]) {
      await db.driverDocument.create({
        data: {
          driverId: profile.id,
          type: doc.type,
          fileKey: SAMPLE_KEY,
          fileName: "seed-driving-licence.pdf",
          mimeType: "application/pdf",
          sizeBytes: SAMPLE_PDF.length,
          status: status === "VERIFIED" ? "APPROVED" : status === "REJECTED" ? "REJECTED" : "PENDING",
        },
      });
    }

    const vehicles: SeedDriver["vehicles"] = [];
    for (let v = 0; v < 2; v++) {
      const vm = VEHICLE_MODELS[(i * 2 + v) % VEHICLE_MODELS.length]!;
      const reg = `UK${String(pick([7, 7, 13, 12, 14, 8])).padStart(2, "0")}${pick(["TA", "TB", "TC", "PA"])}${int(1000, 9999)}`;
      const vStatus = status === "VERIFIED" ? (v === 1 && i === 2 ? "PENDING" : "APPROVED") : status === "REJECTED" ? "REJECTED" : "PENDING";
      const vehicle = await db.vehicle.create({
        data: {
          driverId: profile.id,
          registrationNumber: reg,
          type: vm.type,
          model: vm.model,
          color: pick(COLORS),
          seatCapacity: vm.seats,
          hasCarrier: vm.type !== "INNOVA",
          isAc: vm.type === "INNOVA" || vm.type === "ERTIGA" || vm.type === "TEMPO_TRAVELLER",
          status: vStatus,
        },
      });
      for (const type of ["VEHICLE_RC", "INSURANCE", "PERMIT"] as const) {
        await db.driverDocument.create({
          data: {
            driverId: profile.id,
            vehicleId: vehicle.id,
            type,
            fileKey: SAMPLE_KEY,
            fileName: `seed-${type.toLowerCase()}.pdf`,
            mimeType: "application/pdf",
            sizeBytes: SAMPLE_PDF.length,
            status: vStatus === "APPROVED" ? "APPROVED" : vStatus === "REJECTED" ? "REJECTED" : "PENDING",
          },
        });
      }
      if (vStatus === "APPROVED") vehicles.push({ id: vehicle.id, seats: vm.seats, type: vm.type });
    }
    if (status === "VERIFIED") drivers.push({ profileId: profile.id, userId: user.id, vehicles });
  }

  // Trips: 14 upcoming + 6 completed = 20
  const plans: { daysFromToday: number; hour: number; minute: number; routeIdx: number; driverIdx: number; past: boolean }[] = [];
  const upcomingSlots = [
    [1, 6, 0, 0], [1, 7, 0, 0], [1, 8, 30, 2], [1, 7, 30, 1], [1, 9, 0, 3],
    [2, 6, 30, 0], [2, 8, 0, 1], [2, 7, 0, 2], [3, 7, 0, 0], [3, 10, 0, 1],
    [4, 6, 0, 0], [5, 8, 0, 1], [6, 7, 0, 3], [7, 6, 30, 0],
  ] as const;
  upcomingSlots.forEach(([d, h, m, r], i) => plans.push({ daysFromToday: d, hour: h, minute: m, routeIdx: r, driverIdx: i % drivers.length, past: false }));
  const pastSlots = [[-1, 7, 0, 0], [-2, 8, 0, 1], [-3, 6, 30, 2], [-5, 7, 0, 0], [-8, 9, 0, 1], [-12, 7, 0, 3]] as const;
  pastSlots.forEach(([d, h, m, r], i) => plans.push({ daysFromToday: d, hour: h, minute: m, routeIdx: r, driverIdx: i % drivers.length, past: true }));
  // Make sure the demo driver has a good spread of trips.
  plans[1]!.driverIdx = 0;
  plans[15]!.driverIdx = 0;
  plans[6]!.driverIdx = 0;

  const vehicleBusy = new Map<string, number>();
  let tripCount = 0;
  let bookingCount = 0;

  for (const p of plans) {
    const driver = drivers[p.driverIdx]!;
    const route = routes[p.routeIdx]!;
    const vehicle = driver.vehicles[(vehicleBusy.get(driver.profileId) ?? 0) % driver.vehicles.length]!;
    vehicleBusy.set(driver.profileId, (vehicleBusy.get(driver.profileId) ?? 0) + 1);
    const departureAt = istAt(p.daysFromToday, p.hour, p.minute);
    const arrival = new Date(departureAt.getTime() + route.def.min * 60_000);
    const fare = route.def.fare + pick([0, 0, 50, -50, 30]);
    const totalSeats = vehicle.seats;

    const trip = await db.trip.create({
      data: {
        driverId: driver.profileId,
        vehicleId: vehicle.id,
        routeId: route.id,
        departureAt,
        estimatedArrivalAt: arrival,
        totalSeats,
        pricePerSeatPaise: fare * 100,
        boardingPoint: pick(route.def.boarding),
        dropPoint: pick(route.def.drop),
        notes: pick([null, "Roof carrier available for luggage.", "Tea break at Devprayag.", "Please carry ID. Call before reaching boarding point."]),
        cancellationHours: pick([6, 6, 12, 24]),
        status: p.past ? "COMPLETED" : "SCHEDULED",
        startedAt: p.past ? departureAt : null,
        completedAt: p.past ? arrival : null,
        isSeedData: true,
        createdAt: new Date(departureAt.getTime() - int(2, 6) * 86_400_000),
      },
    });
    const stopRows = [
      { locationId: loc[route.def.from]!.id, sequence: 0, pointName: trip.boardingPoint, scheduledAt: departureAt, fareFromOriginPaise: 0 },
      ...route.def.stops.map((s, i) => ({
        locationId: loc[s.name]!.id,
        sequence: i + 1,
        pointName: s.point,
        scheduledAt: new Date(departureAt.getTime() + s.min * 60_000),
        fareFromOriginPaise: Math.round((s.fare / route.def.fare) * fare) * 100,
      })),
      { locationId: loc[route.def.to]!.id, sequence: route.def.stops.length + 1, pointName: trip.dropPoint, scheduledAt: arrival, fareFromOriginPaise: fare * 100 },
    ];
    for (const s of stopRows) await db.tripStop.create({ data: { ...s, tripId: trip.id } });
    await db.tripSeat.createMany({ data: Array.from({ length: totalSeats }, (_, i) => ({ tripId: trip.id, seatNumber: i + 1 })) });
    const stops = await db.tripStop.findMany({ where: { tripId: trip.id }, orderBy: { sequence: "asc" } });
    tripCount++;

    // Bookings: fill part of the vehicle, never beyond capacity.
    const target = p.past ? int(Math.ceil(totalSeats * 0.5), totalSeats) : int(1, Math.max(1, totalSeats - 2));
    let nextSeat = 1;
    const usedPassengers = new Set<string>();
    while (nextSeat <= target) {
      const seatsWanted = Math.min(int(1, 3), target - nextSeat + 1);
      let pax = pick(passengers);
      // The demo passenger gets one upcoming and a couple of completed trips.
      if (withDemo && bookingCount === 0) pax = passengers[0]!;
      if (withDemo && p.past && nextSeat === 1 && (p.daysFromToday === -1 || p.daysFromToday === -5)) pax = passengers[0]!;
      if (usedPassengers.has(pax.id)) {
        pax = passengers.find((x) => !usedPassengers.has(x.id))!;
      }
      usedPassengers.add(pax.id);

      const boardingIdx = rand() < 0.8 ? 0 : 1;
      const dropIdx = rand() < 0.7 ? stops.length - 1 : Math.max(boardingIdx + 1, stops.length - 2);
      const boarding = stops[boardingIdx]!;
      const drop = stops[dropIdx]!;
      const farePerSeat = drop.fareFromOriginPaise - boarding.fareFromOriginPaise;
      const seatNumbers = Array.from({ length: seatsWanted }, (_, k) => nextSeat + k);
      const fareTotal = farePerSeat * seatsWanted;
      const fee = PLATFORM_FEE * seatsWanted;
      const createdAt = new Date(departureAt.getTime() - int(6, 72) * 3600_000);
      const code = `PS-S${String(bookingCount).padStart(5, "0")}`;

      const booking = await db.booking.create({
        data: {
          code,
          tripId: trip.id,
          userId: pax.id,
          boardingStopId: boarding.id,
          dropStopId: drop.id,
          seatCount: seatsWanted,
          seatNumbers,
          farePerSeatPaise: farePerSeat,
          fareTotalPaise: fareTotal,
          platformFeePaise: fee,
          totalPaise: fareTotal + fee,
          status: p.past ? "COMPLETED" : "CONFIRMED",
          boardingStatus: p.past ? "BOARDED" : "NOT_BOARDED",
          contactPhone: pax.phone,
          confirmedAt: createdAt,
          completedAt: p.past ? arrival : null,
          isSeedData: true,
          createdAt,
          passengers: {
            create: seatNumbers.map((n, k) => ({
              name: k === 0 ? pax.name : `${pick(FIRST)} ${pax.name.split(" ").slice(-1)[0]}`,
              phone: pax.phone,
              seatNumber: n,
            })),
          },
          payments: {
            create: {
              provider: "pay_to_driver",
              method: "PAY_TO_DRIVER",
              status: p.past ? "PAID" : "PENDING",
              amountPaise: fareTotal + fee,
              paidAt: p.past ? departureAt : null,
              createdAt,
            },
          },
        },
      });
      await db.tripSeat.updateMany({
        where: { tripId: trip.id, seatNumber: { in: seatNumbers } },
        data: { status: "BOOKED", bookingId: booking.id },
      });
      await db.analyticsEvent.createMany({
        data: [
          { type: "SEARCH", userId: pax.id, routeKey: `${slug(route.def.from)}__${slug(route.def.to)}`, createdAt: new Date(createdAt.getTime() - 600_000) },
          { type: "RIDE_VIEW", userId: pax.id, tripId: trip.id, createdAt: new Date(createdAt.getTime() - 300_000) },
          { type: "BOOKING_ATTEMPT", userId: pax.id, tripId: trip.id, value: seatsWanted, createdAt },
          { type: "BOOKING_SUCCESS", userId: pax.id, tripId: trip.id, value: fareTotal + fee, routeKey: `${slug(route.def.from)}__${slug(route.def.to)}`, createdAt },
        ],
      });
      if (p.past && rand() < 0.85) {
        await db.review.create({
          data: {
            bookingId: booking.id,
            userId: pax.id,
            driverId: driver.profileId,
            rating: pick([5, 5, 5, 4, 5, 4, 3]),
            comment: pick(REVIEW_TEXT),
            createdAt: new Date(arrival.getTime() + int(1, 20) * 3600_000),
          },
        });
      }
      bookingCount++;
      nextSeat += seatsWanted;
    }
  }

  // A few extra searches that did not convert, so funnel metrics are realistic.
  const extraSearches = Array.from({ length: 140 }, () => {
    const r = pick(ROUTES);
    return {
      type: "SEARCH" as const,
      routeKey: `${slug(r.from)}__${slug(r.to)}`,
      createdAt: istAt(-int(0, 29), int(6, 22), int(0, 59)),
    };
  });
  await db.analyticsEvent.createMany({ data: extraSearches });

  // Recompute driver rating aggregates.
  for (const d of drivers) {
    const agg = await db.review.aggregate({ where: { driverId: d.profileId }, _avg: { rating: true }, _count: true });
    const completed = await db.trip.count({ where: { driverId: d.profileId, status: "COMPLETED" } });
    await db.driverProfile.update({
      where: { id: d.profileId },
      data: {
        ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        ratingCount: agg._count,
        // Seed drivers also have history from before the platform existed.
        completedTrips: completed + int(20, 140),
      },
    });
  }

  // Welcome notifications for demo accounts.
  if (withDemo) {
    const demoDriver = await db.user.findUnique({ where: { email: "driver@demo.com" } });
    const notes = [
      { userId: passengers[0]!.id, type: "GENERAL" as const, title: "Swagat hai! 🙏", body: "Apne route ki available seats dekho aur verified drivers se seat book karo.", link: "/search" },
      ...(demoDriver ? [{ userId: demoDriver.id, type: "DRIVER_VERIFIED" as const, title: "You're verified ✓", body: "Your profile and vehicle are approved. List your next trip and fill your empty seats.", link: "/driver/trips/new" }] : []),
    ];
    await db.notification.createMany({ data: notes });
  }

  console.log(`✅ Seeded ${LOCATIONS.length} locations, ${ROUTES.length} routes, ${drivers.length} verified drivers, ${passengers.length} passengers, ${tripCount} trips, ${bookingCount} bookings.`);
  if (withDemo) console.log(`🔑 Demo password for passenger@demo.com / driver@demo.com / admin@demo.com: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
