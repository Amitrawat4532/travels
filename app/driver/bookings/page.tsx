import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Ticket } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { getDriverBookings, getDriverContext } from "@/server/queries/driver";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate, formatPaise, formatTime, timeAgo } from "@/lib/format";

export default function DriverBookingsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requirePageUser(["DRIVER"], "/driver/bookings");
  const driver = await getDriverContext(user.id);
  if (!driver) redirect("/driver/onboarding");
  const bookings = await getDriverBookings(driver.id);
  const now = new Date();

  return (
    <>
      <PageHeader title="Bookings" description="Every booking on your trips, newest first." />
      {bookings.length === 0 ? (
        <EmptyState icon={<Ticket className="size-7" />} title="No bookings yet" description="Bookings appear here the moment a passenger books a seat on your ride." />
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link href={`/driver/trips/${b.trip.id}`} className="block rounded-2xl border border-line bg-white p-4 shadow-card hover:shadow-lift">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">
                      {b.user.name} <span className="font-medium text-muted">· {b.seatCount} seat{b.seatCount > 1 ? "s" : ""}</span>
                    </p>
                    <p className="text-sm text-muted">
                      {b.trip.route.origin.name} → {b.trip.route.destination.name} · {formatDate(b.trip.departureAt)}, {formatTime(b.trip.departureAt)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <p className="mt-2 text-sm">
                  {b.boardingStop.pointName} → <strong>Drop: {b.dropStop.location.name}</strong>
                </p>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted">
                  <span className="font-mono">{b.code}</span>
                  <span>
                    Fare {formatPaise(b.fareTotalPaise)} · booked {timeAgo(b.createdAt, now)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
