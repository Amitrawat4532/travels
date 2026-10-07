import "server-only";
import type { AnalyticsEventType, Prisma } from "@prisma/client";
import { db } from "@/server/db";

type TrackInput = {
  type: AnalyticsEventType;
  userId?: string | null;
  tripId?: string | null;
  routeKey?: string | null;
  value?: number | null;
  metadata?: Prisma.InputJsonValue;
};

/** Fire-and-forget product analytics. Never throws into the request. */
export function track(event: TrackInput): void {
  db.analyticsEvent
    .create({
      data: {
        type: event.type,
        userId: event.userId ?? null,
        tripId: event.tripId ?? null,
        routeKey: event.routeKey ?? null,
        value: event.value ?? null,
        metadata: event.metadata,
      },
    })
    .catch((e: unknown) => console.warn("[analytics] failed", e));
}
