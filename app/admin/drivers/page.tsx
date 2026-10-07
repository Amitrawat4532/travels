import { Suspense } from "react";
import Link from "next/link";
import type { DriverStatus } from "@prisma/client";
import { requirePageUser } from "@/auth/guards";
import { db } from "@/server/db";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { Avatar, PageHeader, Rating } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Table, Th, Td, EmptyRow } from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { driverDecisionAction } from "@/features/admin/actions";
import { formatDate } from "@/lib/format";

const STATUSES: DriverStatus[] = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED", "DRAFT"];

export default function AdminDriversPage(props: PageProps<"/admin/drivers">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/drivers">["searchParams"] }) {
  await requirePageUser(["ADMIN"], "/admin/drivers");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as DriverStatus) ? (sp.status as DriverStatus) : undefined;
  const [drivers, counts] = await Promise.all([
    db.driverProfile.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ submittedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      include: {
        user: { select: { name: true, phone: true, email: true, avatarKey: true, status: true } },
        vehicles: { select: { model: true, registrationNumber: true, status: true } },
        _count: { select: { documents: true, trips: true } },
      },
      take: 200,
    }),
    db.driverProfile.groupBy({ by: ["status"], _count: true }),
  ]);
  const countOf = (s: DriverStatus) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader title="Drivers" description="Verify documents before a driver can publish rides." />
      <FilterTabs
        label="Driver status"
        items={[
          { label: "All", href: "/admin/drivers", active: !status, count: counts.reduce((n, c) => n + c._count, 0) },
          ...STATUSES.map((s) => ({ label: s === "DRAFT" ? "Not submitted" : s.charAt(0) + s.slice(1).toLowerCase(), href: `/admin/drivers?status=${s}`, active: status === s, count: countOf(s) })),
        ]}
      />
      <Table minWidth={900}>
        <thead>
          <tr>
            <Th>Driver</Th>
            <Th>Phone</Th>
            <Th>Vehicle</Th>
            <Th>Documents</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {drivers.length === 0 && <EmptyRow colSpan={6}>No drivers in this list.</EmptyRow>}
          {drivers.map((d) => (
            <tr key={d.id}>
              <Td>
                <Link href={`/admin/drivers/${d.id}`} className="flex items-center gap-3 hover:text-forest-700">
                  <Avatar name={d.user.name} src={d.user.avatarKey ? `/api/files/${d.user.avatarKey}` : null} size={36} />
                  <span>
                    <span className="block font-semibold">{d.user.name}</span>
                    <span className="text-xs text-muted">{d.submittedAt ? `Submitted ${formatDate(d.submittedAt)}` : d.user.email}</span>
                  </span>
                </Link>
              </Td>
              <Td className="whitespace-nowrap">{d.user.phone}</Td>
              <Td>
                {d.vehicles.length === 0
                  ? "—"
                  : d.vehicles.map((v) => (
                      <span key={v.registrationNumber} className="block">
                        {v.model} <span className="font-mono text-xs text-muted">{v.registrationNumber}</span>
                      </span>
                    ))}
              </Td>
              <Td>
                <Link href={`/admin/drivers/${d.id}`} className="font-semibold text-forest-700 hover:underline">
                  {d._count.documents} files →
                </Link>
              </Td>
              <Td>
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge status={d.status} />
                  {d.status === "VERIFIED" && <Rating value={d.ratingAvg} count={d.ratingCount} className="text-xs" />}
                </div>
              </Td>
              <Td className="text-right">
                <div className="flex justify-end gap-2">
                  {(d.status === "PENDING" || d.status === "REJECTED") && (
                    <ActionButton action={driverDecisionAction} fields={{ id: d.id, decision: "APPROVE" }} variant="primary">
                      Approve
                    </ActionButton>
                  )}
                  {d.status === "PENDING" && (
                    <ConfirmAction
                      action={driverDecisionAction}
                      fields={{ id: d.id, decision: "REJECT" }}
                      trigger="Reject"
                      size="sm"
                      title={`Reject ${d.user.name}?`}
                      reason={{ label: "What should the driver fix?", required: true }}
                      confirmLabel="Reject"
                      danger
                    />
                  )}
                  {d.status === "VERIFIED" && (
                    <ConfirmAction
                      action={driverDecisionAction}
                      fields={{ id: d.id, decision: "SUSPEND" }}
                      trigger="Suspend"
                      size="sm"
                      title={`Suspend ${d.user.name}?`}
                      description="Their rides disappear from search and they cannot publish new ones."
                      reason={{ label: "Reason" }}
                      confirmLabel="Suspend"
                      danger
                    />
                  )}
                  {d.status === "SUSPENDED" && (
                    <ActionButton action={driverDecisionAction} fields={{ id: d.id, decision: "REINSTATE" }}>
                      Reinstate
                    </ActionButton>
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
