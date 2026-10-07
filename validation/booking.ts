import { z } from "zod";
import { MAX_SEATS_PER_BOOKING } from "@/lib/constants";
import { nameSchema, phoneSchema, uuidSchema } from "./common";

export const bookingPassengerSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  seatNumber: z.number().int().positive(),
});

export const createBookingSchema = z
  .object({
    tripId: uuidSchema,
    seatNumbers: z
      .array(z.number().int().positive())
      .min(1, "Select at least one seat")
      .max(MAX_SEATS_PER_BOOKING, `You can book up to ${MAX_SEATS_PER_BOOKING} seats at once`),
    boardingStopId: uuidSchema,
    dropStopId: uuidSchema,
    contactPhone: phoneSchema,
    passengers: z.array(bookingPassengerSchema).min(1),
  })
  .superRefine((v, ctx) => {
    const unique = new Set(v.seatNumbers);
    if (unique.size !== v.seatNumbers.length) {
      ctx.addIssue({ code: "custom", path: ["seatNumbers"], message: "Duplicate seat selected" });
    }
    if (v.passengers.length !== v.seatNumbers.length) {
      ctx.addIssue({
        code: "custom",
        path: ["passengers"],
        message: "Add one passenger for every selected seat",
      });
    }
    const passengerSeats = new Set(v.passengers.map((p) => p.seatNumber));
    if (![...unique].every((s) => passengerSeats.has(s))) {
      ctx.addIssue({ code: "custom", path: ["passengers"], message: "Passenger seats do not match" });
    }
    if (v.boardingStopId === v.dropStopId) {
      ctx.addIssue({
        code: "custom",
        path: ["dropStopId"],
        message: "Boarding and drop point cannot be the same",
      });
    }
  });

export const cancelBookingSchema = z.object({
  bookingId: uuidSchema,
  reason: z.string().trim().max(300).optional(),
});

export const reviewSchema = z.object({
  bookingId: uuidSchema,
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  comment: z
    .string()
    .trim()
    .max(600, "Keep the review under 600 characters")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const complaintSchema = z.object({
  bookingId: uuidSchema.optional().or(z.literal("").transform(() => undefined)),
  subject: z.string().trim().min(4, "Add a short subject").max(120),
  message: z.string().trim().min(10, "Describe the issue in a little more detail").max(2000),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
