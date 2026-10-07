"use server";

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/auth/guards";
import { destroyAllSessionsForUser } from "@/auth/session";
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { slugify } from "@/lib/utils";
import { safeAction } from "@/server/safe-action";
import { notifyAndDispatch } from "@/server/notifications";
import { cancelBookingAs } from "@/server/services/bookings";
import { cancelTrip } from "@/server/services/trips";
import { complaintUpdateSchema, locationSchema, reviewDecisionSchema, routeSchema } from "@/validation/admin";
import { uuidSchema } from "@/validation/common";

async function audit(adminId: string, action: string, entityType: string, entityId: string, note?: string, metadata?: Prisma.InputJsonValue) {
  await db.adminAction.create({ data: { adminId, action, entityType, entityId, note, metadata } });
}

export async function driverDecisionAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await requireUser(["ADMIN"]);
    const parsed = reviewDecisionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail("Invalid request.");
    const { id, decision, note } = parsed.data;
    const driver = await db.driverProfile.findUnique({ where: { id }, include: { user: true } });
    if (!driver) return fail("Driver not found.");

    if (decision === "APPROVE") {
      if (driver.status === "DRAFT") return fail("This driver has not submitted documents yet.");
      await db.$transaction([
        db.driverProfile.update({ where: { id }, data: { status: "VERIFIED", verifiedAt: new Date(), rejectionReason: null } }),
        db.driverDocument.updateMany({ where: { driverId: id, vehicleId: null }, data: { status: "APPROVED" } }),
      ]);
      await notifyAndDispatch([
        {
          userId: driver.userId,
          type: "DRIVER_VERIFIED",
          title: "You're verified ✓",
          body: "Your driver profile is approved. Once your vehicle is approved you can publish rides.",
          link: "/driver",
        },
      ]);
    } else if (decision === "REJECT") {
      if (!note) return fail("Add a reason so the driver knows what to fix.");
      await db.$transaction([
        db.driverProfile.update({ where: { id }, data: { status: "REJECTED", rejectionReason: note } }),
        db.driverDocument.updateMany({ where: { driverId: id, vehicleId: null, status: "PENDING" }, data: { status: "REJECTED", reviewerNote: note } }),
      ]);
      await notifyAndDispatch([
        { userId: driver.userId, type: "DRIVER_REJECTED", title: "Verification not approved", body: note, link: "/driver/onboarding" },
      ]);
    } else if (decision === "SUSPEND") {
      await db.driverProfile.update({ where: { id }, data: { status: "SUSPENDED", rejectionReason: note ?? null } });
      await notifyAndDispatch([
        { userId: driver.userId, type: "GENERAL", title: "Driver account suspended", body: note ?? "Please contact support.", link: "/driver" },
      ]);
    } else {
      await db.driverProfile.update({ where: { id }, data: { status: "VERIFIED", rejectionReason: null } });
    }
    await audit(admin.id, `DRIVER_${decision}`, "DriverProfile", id, note);
    const msg = { APPROVE: "Driver approved", REJECT: "Driver rejected", SUSPEND: "Driver suspended", REINSTATE: "Driver reinstated" };
    return { ok: true, message: msg[decision] };
  });
}

export async function vehicleDecisionAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await requireUser(["ADMIN"]);
    const parsed = reviewDecisionSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail("Invalid request.");
    const { id, decision, note } = parsed.data;
    const vehicle = await db.vehicle.findUnique({ where: { id }, include: { driver: true } });
    if (!vehicle) return fail("Vehicle not found.");
    if (decision !== "APPROVE" && decision !== "REJECT") return fail("Unsupported action.");
    if (decision === "REJECT" && !note) return fail("Add a reason for rejection.");
    const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    await db.$transaction([
      db.vehicle.update({ where: { id }, data: { status, rejectionReason: decision === "REJECT" ? note : null } }),
      db.driverDocument.updateMany({ where: { vehicleId: id }, data: { status, reviewerNote: note ?? null } }),
    ]);
    await notifyAndDispatch([
      {
        userId: vehicle.driver.userId,
        type: decision === "APPROVE" ? "VEHICLE_APPROVED" : "VEHICLE_REJECTED",
        title: decision === "APPROVE" ? `${vehicle.model} approved` : `${vehicle.model} not approved`,
        body: decision === "APPROVE" ? "You can now use this vehicle for trips." : (note ?? ""),
        link: decision === "APPROVE" ? "/driver/trips/new" : "/driver/vehicles",
      },
    ]);
    await audit(admin.id, `VEHICLE_${decision}`, "Vehicle", id, note);
    return { ok: true, message: decision === "APPROVE" ? "Vehicle approved" : "Vehicle rejected" };
  });
}

export async function userStatusAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await requireUser(["ADMIN"]);
    const { id, status } = z.object({ id: uuidSchema, status: z.enum(["ACTIVE", "SUSPENDED"]) }).parse(Object.fromEntries(formData));
    if (id === admin.id) return fail("You cannot suspend yourself.");
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return fail("User not found.");
    if (user.role === "ADMIN") return fail("Admins cannot be suspended here.");
    await db.user.update({ where: { id }, data: { status } });
    if (status === "SUSPENDED") await destroyAllSessionsForUser(id);
    await audit(admin.id, `USER_${status}`, "User", id);
    return { ok: true, message: status === "SUSPENDED" ? "User suspended and signed out" : "User reactivated" };
  });
}

export async function adminCancelBookingAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await requireUser(["ADMIN"]);
    const { bookingId, reason } = z
      .object({ bookingId: uuidSchema, reason: z.string().trim().min(3, "Add a reason").max(300) })
      .parse(Object.fromEntries(formData));
    const { refundPaise } = await cancelBookingAs(admin, bookingId, reason);
    await audit(admin.id, "BOOKING_CANCELLED", "Booking", bookingId, reason, { refundPaise });
    return { ok: true, message: "Booking cancelled; passenger and driver notified." };
  });
}

export async function adminCancelTripAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await requireUser(["ADMIN"]);
    const { tripId, reason } = z
      .object({ tripId: uuidSchema, reason: z.string().trim().min(3, "Add a reason").max(300) })
      .parse(Object.fromEntries(formData));
    const { affectedBookings } = await cancelTrip(null, tripId, reason, true);
    await audit(admin.id, "TRIP_CANCELLED", "Trip", tripId, reason, { affectedBookings });
    return { ok: true, message: `Trip cancelled. ${affectedBookings} booking(s) affected.` };
  });
}

export async function createLocationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await requireUser(["ADMIN"]);
    const parsed = locationSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
    const slug = slugify(parsed.data.name);
    const exists = await db.location.findFirst({ where: { OR: [{ slug }, { name: { equals: parsed.data.name, mode: "insensitive" } }] } });
    if (exists) return fail("This location already exists.", { name: ["Already exists"] });
    const loc = await db.location.create({
      data: { name: parsed.data.name, slug, district: parsed.data.district || null, latitude: parsed.data.latitude, longitude: parsed.data.longitude },
    });
    await audit(admin.id, "LOCATION_CREATED", "Location", loc.id);
    return { ok: true, message: `${loc.name} added` };
  });
}

export async function toggleLocationAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await requireUser(["ADMIN"]);
    const id = uuidSchema.parse(formData.get("id"));
    const loc = await db.location.findUnique({ where: { id } });
    if (!loc) return fail("Not found.");
    await db.location.update({ where: { id }, data: { isActive: !loc.isActive } });
    await audit(admin.id, loc.isActive ? "LOCATION_DEACTIVATED" : "LOCATION_ACTIVATED", "Location", id);
    return { ok: true, message: loc.isActive ? `${loc.name} hidden from search` : `${loc.name} active` };
  });
}

export async function saveRouteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await requireUser(["ADMIN"]);
    const raw = { ...Object.fromEntries(formData), stopIds: formData.getAll("stopIds").map(String).filter(Boolean) };
    const parsed = routeSchema.safeParse(raw);
    if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
    const r = parsed.data;
    const stopIds = r.stopIds.filter((s) => s !== r.originId && s !== r.destinationId);
    const [origin, destination] = await Promise.all([
      db.location.findUnique({ where: { id: r.originId } }),
      db.location.findUnique({ where: { id: r.destinationId } }),
    ]);
    if (!origin || !destination) return fail("Choose valid locations.");

    const slugOf = (id: string) => (id === origin.id ? origin.slug : destination.slug);
    // Distribute stop distance/time evenly — admins can refine per trip.
    const stopRows = (ids: string[]) =>
      ids.map((locationId, i) => ({
        locationId,
        sequence: i + 1,
        distanceFromOriginKm: Math.round((r.distanceKm * (i + 1)) / (ids.length + 1)),
        minutesFromOrigin: Math.round((r.durationMinutes * (i + 1)) / (ids.length + 1)),
      }));

    const upsertOne = async (originId: string, destinationId: string, ids: string[], id?: string) => {
      const data = {
        originId,
        destinationId,
        distanceKm: r.distanceKm,
        durationMinutes: r.durationMinutes,
        suggestedFarePaise: r.suggestedFareRupees * 100,
        isPopular: r.isPopular,
        slug: `${slugOf(originId)}-to-${slugOf(destinationId)}`,
      };
      const existing = id
        ? await db.route.findUnique({ where: { id } })
        : await db.route.findUnique({ where: { originId_destinationId: { originId, destinationId } } });
      if (existing) {
        await db.$transaction([
          db.routeStop.deleteMany({ where: { routeId: existing.id } }),
          db.route.update({ where: { id: existing.id }, data: { ...data, stops: { create: stopRows(ids) } } }),
        ]);
        return existing.id;
      }
      const created = await db.route.create({ data: { ...data, stops: { create: stopRows(ids) } } });
      return created.id;
    };

    const routeId = await upsertOne(r.originId, r.destinationId, stopIds, r.id);
    if (r.createReverse) await upsertOne(r.destinationId, r.originId, [...stopIds].reverse());
    await audit(admin.id, r.id ? "ROUTE_UPDATED" : "ROUTE_CREATED", "Route", routeId, undefined, { createReverse: r.createReverse });
    return { ok: true, message: `Route ${origin.name} → ${destination.name} saved${r.createReverse ? " (with return route)" : ""}` };
  });
}

export async function toggleRouteAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await requireUser(["ADMIN"]);
    const id = uuidSchema.parse(formData.get("id"));
    const route = await db.route.findUnique({ where: { id } });
    if (!route) return fail("Not found.");
    await db.route.update({ where: { id }, data: { isActive: !route.isActive } });
    await audit(admin.id, route.isActive ? "ROUTE_DEACTIVATED" : "ROUTE_ACTIVATED", "Route", id);
    return { ok: true, message: route.isActive ? "Route deactivated — drivers can't list new trips on it" : "Route activated" };
  });
}

export async function updateComplaintAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await requireUser(["ADMIN"]);
    const parsed = complaintUpdateSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail("Invalid request.");
    const c = await db.complaint.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        adminNote: parsed.data.adminNote || undefined,
        resolvedAt: parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED" ? new Date() : null,
      },
    });
    if (parsed.data.status === "RESOLVED") {
      await notifyAndDispatch([
        { userId: c.userId, type: "GENERAL", title: "Your issue is resolved", body: parsed.data.adminNote || c.subject, link: undefined },
      ]);
    }
    await audit(admin.id, `COMPLAINT_${parsed.data.status}`, "Complaint", c.id, parsed.data.adminNote);
    return { ok: true, message: "Complaint updated" };
  });
}

export async function toggleReviewAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const admin = await requireUser(["ADMIN"]);
    const id = uuidSchema.parse(formData.get("id"));
    const review = await db.review.findUnique({ where: { id } });
    if (!review) return fail("Not found.");
    await db.$transaction(async (tx) => {
      await tx.review.update({ where: { id }, data: { isHidden: !review.isHidden } });
      const agg = await tx.review.aggregate({ where: { driverId: review.driverId, isHidden: false }, _avg: { rating: true }, _count: true });
      await tx.driverProfile.update({
        where: { id: review.driverId },
        data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
      });
    });
    await audit(admin.id, review.isHidden ? "REVIEW_RESTORED" : "REVIEW_HIDDEN", "Review", id);
    return { ok: true, message: review.isHidden ? "Review visible again" : "Review hidden & rating recalculated" };
  });
}
