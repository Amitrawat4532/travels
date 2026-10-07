/**
 * End-to-end business-flow check against the real database and services.
 *
 *   npx tsx --conditions=react-server scripts/e2e-flow.ts
 *
 * Exercises: driver registration → document submission → admin approval →
 * trip creation → passenger booking → overbooking/race protection →
 * cancellation (seats return) → boarding → trip completion → rating.
 * Creates its own uniquely-named test users; safe to run repeatedly in dev.
 */
import assert from "node:assert/strict";
import { db } from "@/server/db";
import { hashPassword } from "@/auth/password";
import type { SessionUser } from "@/auth/session";
import { cancelBookingAs, createBooking } from "@/server/services/bookings";
import { cancelTrip, completeTrip, createTrip, setBoardingStatus, updateTrip } from "@/server/services/trips";
import { toIstDateString } from "@/lib/format";

const run = Date.now().toString(36);
const phone = () => `9${Math.floor(100000000 + Math.random() * 899999999)}`;

async function makeUser(role: "PASSENGER" | "DRIVER", name: string): Promise<SessionUser> {
  const u = await db.user.create({
    data: {
      name,
      email: `${role.toLowerCase()}-${run}-${Math.random().toString(36).slice(2, 7)}@e2e.test`,
      phone: phone(),
      passwordHash: await hashPassword("Test@12345"),
      role,
      ...(role === "DRIVER" ? { driverProfile: { create: { status: "DRAFT" } } } : { passengerProfile: { create: {} } }),
    },
  });
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, avatarKey: null };
}

function step(msg: string) {
  console.log(`✔ ${msg}`);
}

async function expectError(p: Promise<unknown>, match: RegExp, label: string) {
  try {
    await p;
  } catch (e) {
    assert.match((e as Error).message, match, label);
    step(`${label} → rejected: "${(e as Error).message}"`);
    return;
  }
  throw new Error(`${label}: expected an error`);
}

async function main() {
  const route = await db.route.findFirstOrThrow({ where: { slug: "dehradun-to-rudraprayag" }, include: { stops: true } });

  // DRIVER: register → submit → cannot publish until verified
  const driverUser = await makeUser("DRIVER", "E2E Driver Rawat");
  const driver = await db.driverProfile.findUniqueOrThrow({ where: { userId: driverUser.id } });
  const vehicle = await db.vehicle.create({
    data: { driverId: driver.id, registrationNumber: `UK07E${run.slice(-4).toUpperCase()}${Math.floor(1000 + Math.random() * 8999)}`.slice(0, 12), type: "BOLERO", model: "Mahindra Bolero Neo", seatCapacity: 8 },
  });
  await db.driverProfile.update({ where: { id: driver.id }, data: { status: "PENDING", submittedAt: new Date(), licenceNumber: "UK0720150012345" } });
  step("Driver registered and submitted documents (status PENDING)");

  const tomorrow = toIstDateString(new Date(Date.now() + 86_400_000));
  const tripInput = {
    routeId: route.id,
    vehicleId: vehicle.id,
    date: tomorrow,
    departureTime: "07:00",
    durationMinutes: 360,
    boardingPoint: "ISBT Dehradun, Gate 2",
    dropPoint: "Rudraprayag Bus Stand",
    stops: route.stops.map((s, i) => ({ locationId: s.locationId, pointName: `Stop ${i + 1}`, minutesFromOrigin: s.minutesFromOrigin, fareRupees: 150 * (i + 1) })),
    totalSeats: 8,
    priceRupees: 650,
    cancellationHours: 6,
    notes: undefined,
  };
  await expectError(createTrip(driverUser, tripInput), /verified/i, "Unverified driver publishing a ride");

  // ADMIN: approve driver + vehicle
  await db.driverProfile.update({ where: { id: driver.id }, data: { status: "VERIFIED", verifiedAt: new Date() } });
  await expectError(createTrip(driverUser, tripInput), /not approved/i, "Publishing with an unapproved vehicle");
  await db.vehicle.update({ where: { id: vehicle.id }, data: { status: "APPROVED" } });
  step("Admin approved driver and vehicle");

  await expectError(createTrip(driverUser, { ...tripInput, totalSeats: 12 }), /only 8/i, "More seats than vehicle capacity");
  const { tripId } = await createTrip(driverUser, tripInput);
  const seats = await db.tripSeat.count({ where: { tripId } });
  assert.equal(seats, 8);
  step(`Trip created with 8 seats (${tripId})`);
  await expectError(createTrip(driverUser, tripInput), /already has a trip/i, "Same vehicle double-scheduled");

  const trip = await db.trip.findUniqueOrThrow({ where: { id: tripId }, include: { stops: { orderBy: { sequence: "asc" } } } });
  const origin = trip.stops[0]!;
  const dest = trip.stops[trip.stops.length - 1]!;
  const srinagar = trip.stops[trip.stops.length - 2]!;

  // PASSENGERS: book 2 + 2 + 1
  const p1 = await makeUser("PASSENGER", "E2E Amit");
  const p2 = await makeUser("PASSENGER", "E2E Pooja");
  const p3 = await makeUser("PASSENGER", "E2E Rahul");
  const pax = (u: SessionUser, seatNumbers: number[]) => ({
    tripId,
    seatNumbers,
    boardingStopId: origin.id,
    dropStopId: dest.id,
    contactPhone: u.phone,
    passengers: seatNumbers.map((n) => ({ name: u.name, phone: u.phone, seatNumber: n })),
  });

  const b1 = await createBooking(p1, pax(p1, [1, 2]));
  const b2 = await createBooking(p2, { ...pax(p2, [3, 4]), dropStopId: srinagar.id });
  const b3 = await createBooking(p3, pax(p3, [5]));
  let available = await db.tripSeat.count({ where: { tripId, status: "AVAILABLE" } });
  assert.equal(available, 3);
  step(`Bookings 2 + 2 + 1 confirmed → available seats = ${available}`);

  const b2Row = await db.booking.findUniqueOrThrow({ where: { id: b2.bookingId } });
  assert.equal(b2Row.farePerSeatPaise, srinagar.fareFromOriginPaise);
  step(`Partial-route fare Dehradun → Srinagar = ₹${b2Row.farePerSeatPaise / 100} per seat`);

  await expectError(createBooking(p1, pax(p1, [6])), /already have booking/i, "Same passenger double booking");
  await expectError(createBooking(await makeUser("PASSENGER", "E2E X"), pax(p3, [5])), /just booked/i, "Booking an already-booked seat");
  await expectError(createBooking(await makeUser("PASSENGER", "E2E Y"), pax(p3, [9])), /does not exist/i, "Booking a seat number beyond capacity");
  await expectError(createBooking(driverUser, pax(driverUser, [6])), /own ride/i, "Driver booking own ride");

  // RACE: 5 passengers try to grab the same 2 seats at the same instant.
  const racers = await Promise.all(Array.from({ length: 5 }, (_, i) => makeUser("PASSENGER", `E2E Racer ${i}`)));
  const results = await Promise.allSettled(racers.map((r) => createBooking(r, pax(r, [6, 7]))));
  const wins = results.filter((r) => r.status === "fulfilled").length;
  assert.equal(wins, 1, "exactly one racer must win");
  available = await db.tripSeat.count({ where: { tripId, status: "AVAILABLE" } });
  assert.equal(available, 1);
  step(`Race: 5 concurrent bookings for seats 6–7 → ${wins} succeeded, ${5 - wins} rejected; available = ${available}`);

  // Driver cannot reduce seats below booked seats.
  await expectError(
    updateTrip(driverUser, { tripId, date: tomorrow, departureTime: "07:00", durationMinutes: 360, boardingPoint: trip.boardingPoint, dropPoint: trip.dropPoint, totalSeats: 6, notes: undefined }),
    /already booked/i,
    "Reducing seats below booked seats",
  );
  await updateTrip(driverUser, { tripId, date: tomorrow, departureTime: "07:00", durationMinutes: 360, boardingPoint: trip.boardingPoint, dropPoint: trip.dropPoint, totalSeats: 7, notes: undefined });
  available = await db.tripSeat.count({ where: { tripId, status: "AVAILABLE" } });
  assert.equal(available, 0);
  step("Driver reduced total seats 8 → 7 (free seat 8 removed); available = 0");

  // CANCEL: seats go back to inventory, then can be re-booked.
  await expectError(cancelBookingAs(p3, b1.bookingId), /not found/i, "Passenger cancelling someone else's booking");
  await cancelBookingAs(p2, b2.bookingId, "Plans changed");
  available = await db.tripSeat.count({ where: { tripId, status: "AVAILABLE" } });
  assert.equal(available, 2);
  step(`Passenger cancelled 2-seat booking → available = ${available}`);
  await expectError(cancelBookingAs(p2, b2.bookingId), /already closed/i, "Cancelling an already-cancelled booking");
  const rebook = await createBooking(p2, pax(p2, [3, 4]));
  step(`Released seats 3–4 re-booked (${rebook.code})`);

  // Notifications were created for passenger & driver.
  const driverNotes = await db.notification.count({ where: { userId: driverUser.id, type: { in: ["NEW_BOOKING", "BOOKING_CANCELLED"] } } });
  assert.ok(driverNotes >= 5);
  step(`Driver received ${driverNotes} booking notifications`);

  // Past trip: move departure into the past to test boarding/completion & booking-after-departure.
  await db.trip.update({ where: { id: tripId }, data: { departureAt: new Date(Date.now() - 60_000) } });
  await expectError(createBooking(await makeUser("PASSENGER", "E2E Late"), pax(p1, [1])), /closed/i, "Booking after departure");
  await setBoardingStatus(driverUser, b1.bookingId, "BOARDED", true);
  await setBoardingStatus(driverUser, b3.bookingId, "NO_SHOW", false);
  await completeTrip(driverUser, tripId);
  const completed = await db.booking.findUniqueOrThrow({ where: { id: b1.bookingId }, include: { payments: true } });
  assert.equal(completed.status, "COMPLETED");
  assert.equal(completed.payments[0]?.status, "PAID");
  step("Driver marked boarding (paid / no-show) and completed the trip");

  const profile = await db.driverProfile.findUniqueOrThrow({ where: { id: driver.id } });
  assert.equal(profile.completedTrips, 1);
  step("Driver completed-trip count incremented");

  // Driver cancels a different trip with bookings → passengers notified, seats freed.
  const trip2 = await createTrip(driverUser, { ...tripInput, date: toIstDateString(new Date(Date.now() + 3 * 86_400_000)) });
  const bb = await createBooking(p1, { ...pax(p1, [1]), tripId: trip2.tripId, boardingStopId: (await db.tripStop.findFirstOrThrow({ where: { tripId: trip2.tripId, sequence: 0 } })).id, dropStopId: (await db.tripStop.findFirstOrThrow({ where: { tripId: trip2.tripId }, orderBy: { sequence: "desc" } })).id });
  await cancelTrip(driverUser, trip2.tripId, "Road closed near Devprayag");
  const cancelled = await db.booking.findUniqueOrThrow({ where: { id: bb.bookingId } });
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.cancelledBy, "DRIVER");
  step("Driver cancelled a trip → booking cancelled & passenger notified");

  console.log("\nAll end-to-end checks passed ✅");
}

main()
  .catch((e) => {
    console.error("❌", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
