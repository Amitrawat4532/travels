import { Suspense } from "react";
import type { BookingStatus } from "@prisma/client";
import { requirePageUser } from "@/auth/guards";
import { db } from "@/server/db";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Table, Th, Td, EmptyRow } from "@/components/ui/table";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { adminCancelBookingAction } from "@/features/admin/actions";
import { formatDate, formatDateTime, formatPaise } from "@/lib/format";

const STATUSES: BookingStatus[] = ["CONFIRMED", "PENDING", "COMPLETED", "CANCELLED", "REFUNDED"];

export default function AdminBookingsPage(props: PageProps<"/admin/bookings">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/bookings">["searchParams"] }) {
  await requirePageUser(["ADMIN"], "/admin/bookings");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as BookingStatus) ? (sp.status as BookingStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().toUpperCase().slice(0, 20) : "";
  const bookings = await db.booking.findMany({
    where: { ...(status ? { status } : {}), ...(q ? { code: { contains: q } } : {}) },
    include: {
      user: { select: { name: true, phone: true } },
      trip: { select: { departureAt: true, driver: { select: { user: { select: { name: true } } } } } },
      boardingStop: { include: { location: true } },
      dropStop: { include: { location: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader title="Bookings" />
      <form className="mb-4 max-w-sm" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <label htmlFor="q" className="sr-only">
          Search booking ID
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search booking ID, e.g. PS-7K3Q9X" className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm focus:border-forest-400 focus:ring-4 focus:ring-forest-100 focus:outline-none" />
      </form>
      <FilterTabs
        label="Booking status"
        items={[
          { label: "All", href: "/admin/bookings", active: !status },
          ...STATUSES.map((s) => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), href: `/admin/bookings?status=${s}`, active: status === s })),
        ]}
      />
      <Table minWidth={1000}>
        <thead>
          <tr>
            <Th>Booking ID</Th>
            <Th>Passenger</Th>
            <Th>Driver</Th>
            <Th>Route</Th>
            <Th>Amount</Th>
            <Th>Status</Th>
            <Th>Created at</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 && <EmptyRow colSpan={8}>No bookings found.</EmptyRow>}
          {bookings.map((b) => (
            <tr key={b.id}>
              <Td className="font-mono text-xs font-semibold">{b.code}</Td>
              <Td>
                {b.user.name}
                <span className="block text-xs text-muted">{b.user.phone}</span>
              </Td>
              <Td>{b.trip.driver.user.name}</Td>
              <Td>
                {b.boardingStop.location.name} → {b.dropStop.location.name}
                <span className="block text-xs text-muted">
                  {formatDate(b.trip.departureAt)} · {b.seatCount} seat(s)
                </span>
              </Td>
              <Td className="font-semibold tabular-nums">{formatPaise(b.totalPaise)}</Td>
              <Td>
                <StatusBadge status={b.status} />
              </Td>
              <Td className="text-xs whitespace-nowrap text-muted">{formatDateTime(b.createdAt)}</Td>
              <Td className="text-right">
                {(b.status === "CONFIRMED" || b.status === "PENDING") && (
                  <ConfirmAction
                    action={adminCancelBookingAction}
                    fields={{ bookingId: b.id }}
                    trigger="Cancel"
                    size="sm"
                    title={`Cancel booking ${b.code}?`}
                    description="Seats return to inventory. Passenger and driver are notified."
                    reason={{ label: "Reason", required: true }}
                    confirmLabel="Cancel booking"
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
