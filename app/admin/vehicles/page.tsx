import { Suspense } from "react";
import Link from "next/link";
import type { VehicleStatus } from "@prisma/client";
import { requirePageUser } from "@/auth/guards";
import { db } from "@/server/db";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Table, Th, Td, EmptyRow } from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { vehicleDecisionAction } from "@/features/admin/actions";
import { VEHICLE_TYPE_LABELS } from "@/lib/constants";

const STATUSES: VehicleStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export default function AdminVehiclesPage(props: PageProps<"/admin/vehicles">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/vehicles">["searchParams"] }) {
  await requirePageUser(["ADMIN"], "/admin/vehicles");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as VehicleStatus) ? (sp.status as VehicleStatus) : undefined;
  const vehicles = await db.vehicle.findMany({
    where: status ? { status } : undefined,
    include: { driver: { include: { user: { select: { name: true, phone: true } } } }, _count: { select: { documents: true, trips: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader title="Vehicles" description="RC, insurance and permit must be valid before approval." />
      <FilterTabs
        label="Vehicle status"
        items={[
          { label: "All", href: "/admin/vehicles", active: !status },
          ...STATUSES.map((s) => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), href: `/admin/vehicles?status=${s}`, active: status === s })),
        ]}
      />
      <Table minWidth={860}>
        <thead>
          <tr>
            <Th>Vehicle</Th>
            <Th>Type</Th>
            <Th>Driver</Th>
            <Th>Docs</Th>
            <Th>Trips</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {vehicles.length === 0 && <EmptyRow colSpan={7}>No vehicles.</EmptyRow>}
          {vehicles.map((v) => (
            <tr key={v.id}>
              <Td>
                <span className="block font-semibold">{v.model}</span>
                <span className="font-mono text-xs text-muted">{v.registrationNumber}</span>
              </Td>
              <Td>
                {VEHICLE_TYPE_LABELS[v.type]} · {v.seatCapacity} seats
              </Td>
              <Td>
                <Link href={`/admin/drivers/${v.driverId}`} className="font-medium text-forest-700 hover:underline">
                  {v.driver.user.name}
                </Link>
                <span className="block text-xs text-muted">{v.driver.user.phone}</span>
              </Td>
              <Td>
                <Link href={`/admin/drivers/${v.driverId}`} className="text-forest-700 hover:underline">
                  {v._count.documents} files · {v.photoKeys.length} photos
                </Link>
              </Td>
              <Td>{v._count.trips}</Td>
              <Td>
                <StatusBadge status={v.status} />
              </Td>
              <Td className="text-right">
                <div className="flex justify-end gap-2">
                  {v.status !== "APPROVED" && (
                    <ActionButton action={vehicleDecisionAction} fields={{ id: v.id, decision: "APPROVE" }} variant="primary">
                      Approve
                    </ActionButton>
                  )}
                  {v.status !== "REJECTED" && (
                    <ConfirmAction
                      action={vehicleDecisionAction}
                      fields={{ id: v.id, decision: "REJECT" }}
                      trigger="Reject"
                      size="sm"
                      title={`Reject ${v.registrationNumber}?`}
                      reason={{ label: "Reason", required: true }}
                      confirmLabel="Reject"
                      danger
                    />
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
