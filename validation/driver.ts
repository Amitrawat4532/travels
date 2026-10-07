import { z } from "zod";

const VEHICLE_TYPES = [
  "HATCHBACK",
  "SEDAN",
  "SUV",
  "BOLERO",
  "SUMO",
  "ERTIGA",
  "INNOVA",
  "TEMPO_TRAVELLER",
  "MINI_BUS",
] as const;

export const vehicleTypeSchema = z.enum(VEHICLE_TYPES, { error: "Choose a vehicle type" });

export const registrationNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine(
    (v) => /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(v),
    "Enter a valid registration number, e.g. UK07TA4521",
  );

export const driverDetailsSchema = z.object({
  licenceNumber: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => /^[A-Z]{2}\d{2}[0-9A-Z]{8,13}$/.test(v), "Enter a valid driving licence number"),
  licenceExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the licence expiry date"),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  languages: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(400).optional(),
  baseLocationId: z.uuid("Choose your base town"),
});

export const vehicleSchema = z.object({
  registrationNumber: registrationNumberSchema,
  type: vehicleTypeSchema,
  model: z.string().trim().min(2, "Add the vehicle model").max(60),
  color: z.string().trim().max(30).optional(),
  seatCapacity: z.coerce.number().int().min(1, "At least 1 seat").max(20, "Maximum 20 seats"),
  isAc: z.coerce.boolean().optional().default(false),
  hasCarrier: z.coerce.boolean().optional().default(false),
  permitNumber: z.string().trim().max(40).optional(),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
