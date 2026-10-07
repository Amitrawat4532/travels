import { z } from "zod";
import { MAX_SEATS_PER_BOOKING } from "@/lib/constants";

/** Lenient parser for URL search params — never throws, falls back to defaults. */
export const searchParamsSchema = z.object({
  from: z.string().trim().max(60).optional().catch(undefined),
  to: z.string().trim().max(60).optional().catch(undefined),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
  passengers: z.coerce.number().int().min(1).max(MAX_SEATS_PER_BOOKING).catch(1).default(1),
});

export type SearchQuery = z.infer<typeof searchParamsSchema>;
