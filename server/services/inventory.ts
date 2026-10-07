import "server-only";
import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Take a row-level lock on the trip for the rest of the transaction.
 * Every operation that changes a trip's seat inventory goes through this, so
 * concurrent bookings / cancellations / seat edits on the same trip are
 * serialised by PostgreSQL itself.
 */
export async function lockTrip(tx: Tx, tripId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${tripId}::uuid FOR UPDATE`;
}

/**
 * Release seats held by online-payment bookings whose hold expired.
 * Called inside the trip lock before reading availability.
 */
export async function releaseExpiredHolds(tx: Tx, tripId: string, now = new Date()): Promise<number> {
  const expired = await tx.booking.findMany({
    where: { tripId, status: "PENDING", holdExpiresAt: { lt: now } },
    select: { id: true },
  });
  if (expired.length === 0) return 0;
  const ids = expired.map((b) => b.id);
  await tx.tripSeat.updateMany({
    where: { bookingId: { in: ids } },
    data: { status: "AVAILABLE", bookingId: null },
  });
  await tx.booking.updateMany({
    where: { id: { in: ids } },
    data: {
      status: "CANCELLED",
      cancelledBy: "SYSTEM",
      cancelReason: "Payment not completed in time",
      cancelledAt: now,
    },
  });
  await tx.payment.updateMany({
    where: { bookingId: { in: ids }, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
  return ids.length;
}

export async function countAvailableSeats(tx: Tx, tripId: string): Promise<number> {
  return tx.tripSeat.count({ where: { tripId, status: "AVAILABLE" } });
}
