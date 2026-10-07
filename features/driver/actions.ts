"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import type { DocumentType, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/auth/guards";
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { safeAction } from "@/server/safe-action";
import { saveUpload, storage } from "@/server/storage";
import {
  cancelTrip,
  completeTrip,
  createTrip,
  setBoardingStatus,
  startTrip,
  toggleSeatBlock,
  updateTrip,
} from "@/server/services/trips";
import { driverDetailsSchema, vehicleSchema } from "@/validation/driver";
import { cancelTripSchema, createTripSchema, updateTripSchema } from "@/validation/trip";
import { uuidSchema } from "@/validation/common";
import { istToDate } from "@/lib/format";

const MAX_VEHICLE_PHOTOS = 6;

function fileFrom(formData: FormData, name: string): File | null {
  const f = formData.get(name);
  return f instanceof File && f.size > 0 ? f : null;
}

function filesFrom(formData: FormData, name: string): File[] {
  return formData.getAll(name).filter((f): f is File => f instanceof File && f.size > 0);
}

async function getDriver(userId: string) {
  const driver = await db.driverProfile.findUnique({ where: { userId } });
  if (!driver) throw new AppError("Driver profile not found.");
  return driver;
}

function vehicleData(v: z.infer<typeof vehicleSchema>) {
  return {
    registrationNumber: v.registrationNumber,
    type: v.type,
    model: v.model,
    color: v.color || null,
    seatCapacity: v.seatCapacity,
    isAc: v.isAc,
    hasCarrier: v.hasCarrier,
  };
}

/** Validate & store all files first so a bad file never leaves half-written rows. */
async function storeVehicleFiles(formData: FormData, driverId: string, required: boolean) {
  const rc = fileFrom(formData, "rcDoc");
  const insurance = fileFrom(formData, "insuranceDoc");
  const permit = fileFrom(formData, "permitDoc");
  const photos = filesFrom(formData, "vehiclePhotos").slice(0, MAX_VEHICLE_PHOTOS);
  const missing: Record<string, string[]> = {};
  if (required && !rc) missing.rcDoc = ["Upload the vehicle RC"];
  if (required && !insurance) missing.insuranceDoc = ["Upload the insurance certificate"];
  if (Object.keys(missing).length) return { error: missing } as const;

  const prefix = `drivers/${driverId}`;
  const docs: { type: DocumentType; file: Awaited<ReturnType<typeof saveUpload>> }[] = [];
  if (rc) docs.push({ type: "VEHICLE_RC", file: await saveUpload(rc, prefix) });
  if (insurance) docs.push({ type: "INSURANCE", file: await saveUpload(insurance, prefix) });
  if (permit) docs.push({ type: "PERMIT", file: await saveUpload(permit, prefix) });
  const photoKeys: string[] = [];
  for (const p of photos) photoKeys.push((await saveUpload(p, `${prefix}/vehicle-photos`, { imagesOnly: true })).key);
  return { docs, photoKeys } as const;
}

export async function submitOnboardingAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["DRIVER"]);
    const limit = await rateLimit("onboarding", 10, 60 * 60_000, user.id);
    if (!limit.allowed) return fail("Too many submissions. Please try again later.");
    const driver = await getDriver(user.id);
    if (driver.status === "VERIFIED" || driver.status === "PENDING") {
      return fail("Your documents are already submitted.");
    }
    if (driver.status === "SUSPENDED") return fail("Your account is suspended. Please contact support.");

    const raw = Object.fromEntries(formData);
    const details = driverDetailsSchema.safeParse(raw);
    const vehicle = vehicleSchema.safeParse(raw);
    const errors = {
      ...(details.success ? {} : zodFieldErrors(details.error)),
      ...(vehicle.success ? {} : zodFieldErrors(vehicle.error)),
    };
    const photo = fileFrom(formData, "profilePhoto");
    const licence = fileFrom(formData, "licenceDoc");
    const hasPhoto = Boolean(user.avatarKey);
    if (!photo && !hasPhoto) errors.profilePhoto = ["Add a clear photo of your face"];
    if (!licence) errors.licenceDoc = ["Upload your driving licence"];
    if (!formData.get("rcDoc") || (formData.get("rcDoc") as File).size === 0) errors.rcDoc = ["Upload the vehicle RC"];
    if (!formData.get("insuranceDoc") || (formData.get("insuranceDoc") as File).size === 0)
      errors.insuranceDoc = ["Upload the insurance certificate"];
    if (!details.success || !vehicle.success || Object.keys(errors).length) {
      return fail("Please complete the highlighted fields.", errors);
    }

    const existingVehicle = await db.vehicle.findUnique({ where: { registrationNumber: vehicle.data.registrationNumber } });
    if (existingVehicle && existingVehicle.driverId !== driver.id) {
      return fail("This vehicle is already registered by another driver.", { registrationNumber: ["Already registered"] });
    }

    const prefix = `drivers/${driver.id}`;
    const photoFile = photo ? await saveUpload(photo, `${prefix}/profile`, { imagesOnly: true }) : null;
    const licenceFile = await saveUpload(licence!, prefix);
    const vf = await storeVehicleFiles(formData, driver.id, true);
    if ("error" in vf) return fail("Please upload the required documents.", vf.error);

    const d = details.data;
    await db.$transaction(async (tx) => {
      if (photoFile) {
        await tx.user.update({ where: { id: user.id }, data: { avatarKey: photoFile.key } });
        await tx.driverDocument.create({
          data: { driverId: driver.id, type: "PROFILE_PHOTO", fileKey: photoFile.key, fileName: photoFile.fileName, mimeType: photoFile.mimeType, sizeBytes: photoFile.sizeBytes },
        });
      }
      await tx.driverDocument.create({
        data: { driverId: driver.id, type: "DRIVING_LICENCE", fileKey: licenceFile.key, fileName: licenceFile.fileName, mimeType: licenceFile.mimeType, sizeBytes: licenceFile.sizeBytes },
      });
      const v = existingVehicle
        ? await tx.vehicle.update({
            where: { id: existingVehicle.id },
            data: { ...vehicleData(vehicle.data), status: "PENDING", rejectionReason: null, photoKeys: { push: vf.photoKeys } },
          })
        : await tx.vehicle.create({ data: { ...vehicleData(vehicle.data), driverId: driver.id, photoKeys: vf.photoKeys } });
      for (const doc of vf.docs) {
        await tx.driverDocument.create({
          data: { driverId: driver.id, vehicleId: v.id, type: doc.type, fileKey: doc.file.key, fileName: doc.file.fileName, mimeType: doc.file.mimeType, sizeBytes: doc.file.sizeBytes },
        });
      }
      await tx.driverProfile.update({
        where: { id: driver.id },
        data: {
          status: "PENDING",
          submittedAt: new Date(),
          rejectionReason: null,
          licenceNumber: d.licenceNumber,
          licenceExpiry: istToDate(d.licenceExpiry),
          yearsExperience: d.yearsExperience,
          languages: d.languages || null,
          bio: d.bio || null,
          baseLocationId: d.baseLocationId,
          permitNumber: vehicle.data.permitNumber || null,
        },
      });
      const admins = await tx.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
      await tx.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "GENERAL" as const,
          title: "New driver verification request",
          body: `${user.name} submitted documents for ${vehicle.data.model} (${vehicle.data.registrationNumber}).`,
          link: `/admin/drivers/${driver.id}`,
        })),
      });
    });
    redirect("/driver?submitted=1");
  });
}

export async function addVehicleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["DRIVER"]);
    const driver = await getDriver(user.id);
    if (driver.status === "SUSPENDED") return fail("Your account is suspended.");
    const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
    const count = await db.vehicle.count({ where: { driverId: driver.id } });
    if (count >= 5) return fail("You can register up to 5 vehicles.");
    const exists = await db.vehicle.findUnique({ where: { registrationNumber: parsed.data.registrationNumber } });
    if (exists) return fail("This vehicle is already registered.", { registrationNumber: ["Already registered"] });

    const vf = await storeVehicleFiles(formData, driver.id, true);
    if ("error" in vf) return fail("Please upload the required documents.", vf.error);
    await db.vehicle.create({
      data: {
        ...vehicleData(parsed.data),
        driverId: driver.id,
        photoKeys: vf.photoKeys,
        documents: {
          create: vf.docs.map((doc) => ({
            driverId: driver.id,
            type: doc.type,
            fileKey: doc.file.key,
            fileName: doc.file.fileName,
            mimeType: doc.file.mimeType,
            sizeBytes: doc.file.sizeBytes,
          })),
        },
      },
    });
    if (parsed.data.permitNumber && !driver.permitNumber) {
      await db.driverProfile.update({ where: { id: driver.id }, data: { permitNumber: parsed.data.permitNumber } });
    }
    return { ok: true, message: "Vehicle submitted for verification. We usually review within 24 hours." };
  });
}

export async function addVehiclePhotosAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["DRIVER"]);
    const driver = await getDriver(user.id);
    const vehicleId = uuidSchema.parse(formData.get("vehicleId"));
    const vehicle = await db.vehicle.findFirst({ where: { id: vehicleId, driverId: driver.id } });
    if (!vehicle) return fail("Vehicle not found.");
    const files = filesFrom(formData, "vehiclePhotos");
    if (files.length === 0) return fail("Choose at least one photo.", { vehiclePhotos: ["Choose a photo"] });
    const room = MAX_VEHICLE_PHOTOS - vehicle.photoKeys.length;
    if (room <= 0) return fail(`You can keep up to ${MAX_VEHICLE_PHOTOS} photos. Remove one first.`);
    const keys: string[] = [];
    for (const f of files.slice(0, room)) {
      keys.push((await saveUpload(f, `drivers/${driver.id}/vehicle-photos`, { imagesOnly: true })).key);
    }
    await db.vehicle.update({ where: { id: vehicle.id }, data: { photoKeys: { push: keys } } });
    return { ok: true, message: `${keys.length} photo${keys.length > 1 ? "s" : ""} added.` };
  });
}

export async function removeVehiclePhotoAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["DRIVER"]);
    const driver = await getDriver(user.id);
    const vehicleId = uuidSchema.parse(formData.get("vehicleId"));
    const key = String(formData.get("key") ?? "");
    const vehicle = await db.vehicle.findFirst({ where: { id: vehicleId, driverId: driver.id } });
    if (!vehicle || !vehicle.photoKeys.includes(key)) return fail("Photo not found.");
    await db.vehicle.update({ where: { id: vehicle.id }, data: { photoKeys: vehicle.photoKeys.filter((k) => k !== key) } });
    await storage.remove(key);
    return { ok: true, message: "Photo removed." };
  });
}

export async function toggleVehicleActiveAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["DRIVER"]);
    const driver = await getDriver(user.id);
    const vehicleId = uuidSchema.parse(formData.get("vehicleId"));
    const vehicle = await db.vehicle.findFirst({ where: { id: vehicleId, driverId: driver.id } });
    if (!vehicle) return fail("Vehicle not found.");
    await db.vehicle.update({ where: { id: vehicle.id }, data: { isActive: !vehicle.isActive } });
    return { ok: true, message: vehicle.isActive ? "Vehicle hidden from new trips." : "Vehicle active again." };
  });
}

const driverAboutSchema = z.object({
  bio: z.string().trim().max(400).optional(),
  languages: z.string().trim().max(80).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(60),
});

export async function updateDriverAboutAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["DRIVER"]);
    const driver = await getDriver(user.id);
    const parsed = driverAboutSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
    const photo = fileFrom(formData, "profilePhoto");
    const data: Prisma.DriverProfileUpdateInput = {
      bio: parsed.data.bio || null,
      languages: parsed.data.languages || null,
      yearsExperience: parsed.data.yearsExperience,
    };
    if (photo) {
      const f = await saveUpload(photo, `drivers/${driver.id}/profile`, { imagesOnly: true });
      await db.user.update({ where: { id: user.id }, data: { avatarKey: f.key } });
    }
    await db.driverProfile.update({ where: { id: driver.id }, data });
    return { ok: true, message: "Driver profile updated." };
  });
}

/* ───────────── Trips ───────────── */

export async function createTripAction(input: unknown): Promise<ActionResult<{ tripId: string }>> {
  return safeAction<{ tripId: string }>(async () => {
    const user = await requireUser(["DRIVER"]);
    const limit = await rateLimit("create-trip", 20, 60 * 60_000, user.id);
    if (!limit.allowed) return fail("Too many trips created in a short time.");
    const parsed = createTripSchema.safeParse(input);
    if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
    const { tripId } = await createTrip(user, parsed.data);
    return { ok: true, message: "Ride published! Passengers can book now.", data: { tripId } };
  });
}

export async function updateTripAction(input: unknown): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["DRIVER"]);
    const parsed = updateTripSchema.safeParse(input);
    if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
    await updateTrip(user, parsed.data);
    return { ok: true, message: "Trip updated. Passengers have been notified of changes." };
  });
}

export async function cancelTripAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["DRIVER"]);
    const parsed = cancelTripSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request.");
    const { affectedBookings } = await cancelTrip(user, parsed.data.tripId, parsed.data.reason);
    return { ok: true, message: affectedBookings ? `Trip cancelled. ${affectedBookings} passenger(s) notified.` : "Trip cancelled." };
  });
}

const tripIdSchema = z.object({ tripId: uuidSchema });

export async function startTripAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["DRIVER"]);
    const { tripId } = tripIdSchema.parse(Object.fromEntries(formData));
    await startTrip(user, tripId);
    return { ok: true, message: "Trip started. Shubh yatra! 🙏" };
  });
}

export async function completeTripAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["DRIVER"]);
    const { tripId } = tripIdSchema.parse(Object.fromEntries(formData));
    await completeTrip(user, tripId);
    return { ok: true, message: "Trip marked completed. Passengers can now rate you." };
  });
}

export async function toggleSeatBlockAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["DRIVER"]);
    const parsed = z.object({ tripId: uuidSchema, seatNumber: z.coerce.number().int().positive() }).parse(Object.fromEntries(formData));
    await toggleSeatBlock(user, parsed.tripId, parsed.seatNumber);
    return { ok: true, message: `Seat ${parsed.seatNumber} updated.` };
  });
}

export async function setBoardingAction(formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser(["DRIVER"]);
    const parsed = z
      .object({
        bookingId: uuidSchema,
        status: z.enum(["BOARDED", "NO_SHOW", "NOT_BOARDED"]),
        paid: z.enum(["true", "false"]).optional(),
      })
      .parse(Object.fromEntries(formData));
    await setBoardingStatus(user, parsed.bookingId, parsed.status, parsed.paid === "true");
    const labels = { BOARDED: "Marked as boarded", NO_SHOW: "Marked as no-show", NOT_BOARDED: "Boarding reset" };
    return { ok: true, message: labels[parsed.status] };
  });
}
