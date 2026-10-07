import { Suspense } from "react";
import type { ComplaintStatus } from "@prisma/client";
import { MessageSquareWarning } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { db } from "@/server/db";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { ComplaintControls } from "@/features/admin/complaint-controls";
import { formatDateTime } from "@/lib/format";

const STATUSES: ComplaintStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function AdminComplaintsPage(props: PageProps<"/admin/complaints">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/complaints">["searchParams"] }) {
  await requirePageUser(["ADMIN"], "/admin/complaints");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as ComplaintStatus) ? (sp.status as ComplaintStatus) : undefined;
  const complaints = await db.complaint.findMany({
    where: status ? { status } : { status: { in: ["OPEN", "IN_PROGRESS"] } },
    include: {
      user: { select: { name: true, phone: true, role: true } },
      booking: { select: { code: true, trip: { select: { driver: { select: { user: { select: { name: true } } } } } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <>
      <PageHeader title="Complaints" description="Issues raised by passengers and drivers." />
      <FilterTabs
        label="Complaint status"
        items={[
          { label: "Needs action", href: "/admin/complaints", active: !status },
          ...STATUSES.map((s) => ({ label: s === "IN_PROGRESS" ? "In progress" : s.charAt(0) + s.slice(1).toLowerCase(), href: `/admin/complaints?status=${s}`, active: status === s })),
        ]}
      />
      {complaints.length === 0 ? (
        <EmptyState icon={<MessageSquareWarning className="size-7" />} title="No complaints here" description="Sab theek chal raha hai 🙏" />
      ) : (
        <ul className="space-y-4">
          {complaints.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{c.subject}</p>
                  <p className="text-xs text-muted">
                    {c.user.name} ({c.user.role.toLowerCase()}) · {c.user.phone} · {formatDateTime(c.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {c.booking && <Badge>{c.booking.code} · driver {c.booking.trip.driver.user.name}</Badge>}
                  <StatusBadge status={c.status} />
                </div>
              </div>
              <p className="mt-3 text-sm whitespace-pre-line text-ink-2">{c.message}</p>
              <ComplaintControls id={c.id} status={c.status} note={c.adminNote ?? ""} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
