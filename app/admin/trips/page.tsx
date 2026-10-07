import { Suspense } from "react";
import Link from "next/link";
import type { TripStatus } from "@prisma/client";
import { requirePageUser } from "@/auth/guards";
import { db } from "@/server/db";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Table, Th, Td, EmptyRow } from "@/components/ui/table";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { adminCancelTripAction } from "@/features/admin/actions";
import { formatDate, formatTime } from "@/lib/format";

const STATUSES: TripStatus[] = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function AdminTripsPage(props: PageProps<"/admin/trips">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/trips">["searchParams"] }) {
  await requirePageUser(["ADMIN"], "/admin/trips");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as TripStatus) ? (sp.status as TripStatus) : undefined;
  const trips = await db.trip.findMany({
    where: status ? { status } : undefined,
    include: {
      route: { include: { origin: true, destination: true } },
      driver: { include: { user: { select: { name: true } } } },
      vehicle: { select: { model: true } },
      _count: { select: { seats: { where: { status: "BOOKED" } }, bookings: { where: { status: { in: ["CONFIRMED", "COMPLETED", "PENDING"] } } } } },
    },
    orderBy: { departureAt: status === "COMPLETED" || status === "CANCELLED" ? "desc" : "asc" },
    take: 200,
  });

  return (
    <>
      <PageHeader title="Trips" />
      <FilterTabs
        label="Trip status"
        items={[
          { label: "All", href: "/admin/trips", active: !status },
          ...STATUSES.map((s) => ({ label: s === "IN_PROGRESS" ? "On the way" : s.charAt(0) + s.slice(1).toLowerCase(), href: `/admin/trips?status=${s}`, active: status === s })),
        ]}
      />
      <Table minWidth={900}>
        <thead>
          <tr>
            <Th>Route</Th>
            <Th>Driver</Th>
            <Th>Date</Th>
            <Th>Seats</Th>
            <Th>Bookings</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {trips.length === 0 && <EmptyRow colSpan={7}>No trips.</EmptyRow>}
          {trips.map((t) => (
            <tr key={t.id}>
              <Td>
                <Link href={`/rides/${t.id}`} className="font-semibold hover:text-forest-700">
                  {t.route.origin.name} → {t.route.destination.name}
                </Link>
                <span className="block text-xs text-muted">{t.vehicle.model}</span>
              </Td>
              <Td>
                <Link href={`/admin/drivers/${t.driverId}`} className="text-forest-700 hover:underline">
                  {t.driver.user.name}
                </Link>
              </Td>
              <Td className="whitespace-nowrap">
                {formatDate(t.departureAt)}
                <span className="block text-xs text-muted">{formatTime(t.departureAt)}</span>
              </Td>
              <Td className="tabular-nums">
                {t._count.seats}/{t.totalSeats}
              </Td>
              <Td className="tabular-nums">{t._count.bookings}</Td>
              <Td>
                <StatusBadge status={t.status} />
              </Td>
              <Td className="text-right">
                {t.status === "SCHEDULED" && (
                  <ConfirmAction
                    action={adminCancelTripAction}
                    fields={{ tripId: t.id }}
                    trigger="Cancel"
                    size="sm"
                    title="Cancel this trip as admin?"
                    description="All bookings are cancelled and passengers notified with a full refund where paid."
                    reason={{ label: "Reason (shown to passengers)", required: true }}
                    confirmLabel="Cancel trip"
                    danger
                  />
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
