import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, Phone, Users } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { getDriverContext } from "@/server/queries/driver";
import { db } from "@/server/db";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { formatShortDay, formatTime } from "@/lib/format";
import { telLink, whatsappLink } from "@/lib/utils";

export default function DriverPassengersPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requirePageUser(["DRIVER"], "/driver/passengers");
  const driver = await getDriverContext(user.id);
  if (!driver) redirect("/driver/onboarding");

  // Only passengers on this driver's own upcoming trips.
  const trips = await db.trip.findMany({
    where: { driverId: driver.id, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
    orderBy: { departureAt: "asc" },
    include: {
      route: { include: { origin: true, destination: true } },
      bookings: {
        where: { status: { in: ["CONFIRMED", "PENDING"] } },
        orderBy: { dropStop: { sequence: "asc" } },
        include: {
          user: { select: { name: true } },
          boardingStop: { include: { location: true } },
          dropStop: { include: { location: true } },
        },
      },
    },
  });
  const withPassengers = trips.filter((t) => t.bookings.length > 0);

  return (
    <>
      <PageHeader title="Passengers" description="Passengers on your upcoming trips, sorted by where they get down." />
      {withPassengers.length === 0 ? (
        <EmptyState icon={<Users className="size-7" />} title="No passengers yet" description="Once passengers book your upcoming rides, you'll see their pickup and drop points here." />
      ) : (
        <div className="space-y-6">
          {withPassengers.map((t) => {
            const d = formatShortDay(t.departureAt);
            return (
              <section key={t.id} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                <Link href={`/driver/trips/${t.id}`} className="flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-3 hover:bg-paper-2">
                  <p className="font-extrabold uppercase">
                    {t.route.origin.name} → {t.route.destination.name}
                  </p>
                  <p className="text-sm font-semibold text-muted">
                    {d.day} {d.month} · {formatTime(t.departureAt)}
                  </p>
                </Link>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="text-left text-xs tracking-wide text-muted uppercase">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Passenger</th>
                        <th className="px-4 py-2 font-semibold">Seats</th>
                        <th className="px-4 py-2 font-semibold">Boarding</th>
                        <th className="px-4 py-2 font-semibold">Drop</th>
                        <th className="px-4 py-2 font-semibold">Phone</th>
                        <th className="px-4 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {t.bookings.map((b) => (
                        <tr key={b.id}>
                          <td className="px-4 py-3 font-semibold">{b.user.name}</td>
                          <td className="px-4 py-3">
                            {b.seatCount} <span className="text-muted">({b.seatNumbers.join(", ")})</span>
                          </td>
                          <td className="px-4 py-3">{b.boardingStop.pointName}</td>
                          <td className="px-4 py-3 font-semibold text-marigold-700">{b.dropStop.location.name}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2">
                              <a href={telLink(b.contactPhone)} className="inline-flex items-center gap-1 font-medium text-forest-700 hover:underline">
                                <Phone className="size-3.5" aria-hidden /> {b.contactPhone}
                              </a>
                              <a href={whatsappLink(b.contactPhone)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${b.user.name}`} className="text-[#136c3a]">
                                <MessageCircle className="size-4" />
                              </a>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={b.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
