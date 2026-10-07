import type { VehicleType } from "@prisma/client";

export const APP_NAME = "Pahadi Seat";
export const APP_TAGLINE = "Verified local drivers se seat book karo";
export const SUPPORT_PHONE = "+91 98370 00000";
export const SUPPORT_EMAIL = "help@pahadiseat.in";
export const SUPPORT_WHATSAPP = "919837000000";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

/** All money is in paise. ₹20 per seat platform convenience fee. */
export const PLATFORM_FEE_PER_SEAT_PAISE = 2000;

/** Maximum seats one booking can hold. */
export const MAX_SEATS_PER_BOOKING = 6;

/** Bookings close this many minutes before departure. */
export const BOOKING_CUTOFF_MINUTES = 30;

/** Online-payment bookings hold seats this long before auto-release. */
export const PAYMENT_HOLD_MINUTES = 15;

/** Refund percentage when cancelling after the free-cancellation window. */
export const LATE_CANCELLATION_REFUND_PERCENT = 50;

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  HATCHBACK: "Hatchback",
  SEDAN: "Sedan",
  SUV: "SUV",
  BOLERO: "Bolero",
  SUMO: "Tata Sumo",
  ERTIGA: "Ertiga",
  INNOVA: "Innova",
  TEMPO_TRAVELLER: "Tempo Traveller",
  MINI_BUS: "Mini Bus",
};

/** Sensible passenger seat counts per vehicle type (excluding the driver). */
export const VEHICLE_DEFAULT_SEATS: Record<VehicleType, number> = {
  HATCHBACK: 4,
  SEDAN: 4,
  SUV: 6,
  BOLERO: 8,
  SUMO: 9,
  ERTIGA: 6,
  INNOVA: 7,
  TEMPO_TRAVELLER: 12,
  MINI_BUS: 20,
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
