import { z } from "zod";
import { uuidSchema } from "./common";

export const reviewDecisionSchema = z.object({
  id: uuidSchema,
  decision: z.enum(["APPROVE", "REJECT", "SUSPEND", "REINSTATE"]),
  note: z.string().trim().max(300).optional(),
});

export const locationSchema = z.object({
  name: z.string().trim().min(2, "Enter a location name").max(60),
  district: z.string().trim().max(60).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("").transform(() => undefined)),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("").transform(() => undefined)),
});

export const routeSchema = z
  .object({
    id: uuidSchema.optional().or(z.literal("").transform(() => undefined)),
    originId: uuidSchema,
    destinationId: uuidSchema,
    distanceKm: z.coerce.number().int().min(1).max(2000),
    durationMinutes: z.coerce.number().int().min(10).max(2000),
    suggestedFareRupees: z.coerce.number().int().min(10).max(20000),
    isPopular: z.coerce.boolean().optional().default(false),
    stopIds: z.array(uuidSchema).max(15).default([]),
    createReverse: z.coerce.boolean().optional().default(false),
  })
  .refine((v) => v.originId !== v.destinationId, {
    path: ["destinationId"],
    message: "Origin and destination must be different",
  });

export const complaintUpdateSchema = z.object({
  id: uuidSchema,
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  adminNote: z.string().trim().max(1000).optional(),
});
