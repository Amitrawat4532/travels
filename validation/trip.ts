import { z } from "zod";
import { dateStringSchema, timeStringSchema, uuidSchema } from "./common";

export const tripStopInputSchema = z.object({
  locationId: uuidSchema,
  pointName: z.string().trim().min(2, "Add the stop landmark").max(120),
  minutesFromOrigin: z.number().int().min(1).max(24 * 60),
  fareRupees: z.number().int().min(0).max(10000),
});

export const createTripSchema = z
  .object({
    routeId: uuidSchema,
    vehicleId: uuidSchema,
    date: dateStringSchema,
    departureTime: timeStringSchema,
    durationMinutes: z
      .number()
      .int()
      .min(30, "Trip should be at least 30 minutes")
      .max(24 * 60, "Trip cannot be longer than 24 hours"),
    boardingPoint: z.string().trim().min(3, "Add a boarding point").max(120),
    dropPoint: z.string().trim().min(3, "Add a drop point").max(120),
    stops: z.array(tripStopInputSchema).max(12),
    totalSeats: z.number().int().min(1, "At least 1 seat").max(20, "Maximum 20 seats"),
    priceRupees: z.number().int().min(50, "Minimum ₹50 per seat").max(10000),
    cancellationHours: z.number().int().min(0).max(72),
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    let lastMinutes = 0;
    let lastFare = 0;
    v.stops.forEach((s, i) => {
      if (seen.has(s.locationId)) {
        ctx.addIssue({ code: "custom", path: ["stops", i, "locationId"], message: "Stop added twice" });
      }
      seen.add(s.locationId);
      if (s.minutesFromOrigin <= lastMinutes || s.minutesFromOrigin >= v.durationMinutes) {
        ctx.addIssue({
          code: "custom",
          path: ["stops", i, "minutesFromOrigin"],
          message: "Stop times must be in order and before arrival",
        });
      }
      if (s.fareRupees < lastFare || s.fareRupees > v.priceRupees) {
        ctx.addIssue({
          code: "custom",
          path: ["stops", i, "fareRupees"],
          message: "Stop fares must increase along the route and not exceed the full fare",
        });
      }
      lastMinutes = s.minutesFromOrigin;
      lastFare = s.fareRupees;
    });
  });

export const updateTripSchema = z.object({
  tripId: uuidSchema,
  date: dateStringSchema,
  departureTime: timeStringSchema,
  durationMinutes: z.number().int().min(30).max(24 * 60),
  boardingPoint: z.string().trim().min(3).max(120),
  dropPoint: z.string().trim().min(3).max(120),
  totalSeats: z.number().int().min(1).max(20),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const cancelTripSchema = z.object({
  tripId: uuidSchema,
  reason: z.string().trim().min(5, "Tell passengers why the trip is cancelled").max(300),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
