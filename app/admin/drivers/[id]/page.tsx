import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { db } from "@/server/db";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { Avatar, KeyValue, Rating } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { VehicleVisual } from "@/features/vehicles/vehicle-visual";
import { driverDecisionAction, vehicleDecisionAction } from "@/features/admin/actions";
import { VEHICLE_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatDateLong, formatDateTime } from "@/lib/format";

export default function AdminDriverPage(props: PageProps<"/admin/drivers/[id]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

const DOC_LABEL: Record<string, string> = {
  PROFILE_PHOTO: "Profile photo",
  DRIVING_LICENCE: "Driving licence",
  VEHICLE_RC: "Vehicle RC",
  INSURANCE: "Insurance",
  PERMIT: "Permit",
};

async function Content({ params }: { params: PageProps<"/admin/drivers/[id]">["params"] }) {
  await requirePageUser(["ADMIN"], "/admin/drivers");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await db.driverProfile.findUnique({
    where: { id },
    include: {
      user: true,
      baseLocation: true,
      vehicles: { include: { documents: true }, orderBy: { createdAt: "asc" } },
      documents: { where: { vehicleId: null }, orderBy: { createdAt: "desc" } },
      _count: { select: { trips: true } },
    },
  });
  if (!d) notFound();
  const history = await db.adminAction.findMany({
    where: { entityId: { in: [d.id, ...d.vehicles.map((v) => v.id)] } },
    include: { admin: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <>
      <Link href="/admin/drivers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Drivers
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={d.user.name} src={d.user.avatarKey ? `/api/files/${d.user.avatarKey}` : null} size={64} />
          <div>
            <h1 className="text-2xl font-extrabold">{d.user.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={d.status} />
              <Rating value={d.ratingAvg} count={d.ratingCount} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(d.status === "PENDING" || d.status === "REJECTED") && (
            <ActionButton action={driverDecisionAction} fields={{ id: d.id, decision: "APPROVE" }} variant="primary" size="md">
              Approve driver
            </ActionButton>
          )}
          {d.status === "PENDING" && (
            <ConfirmAction
              action={driverDecisionAction}
              fields={{ id: d.id, decision: "REJECT" }}
              trigger="Reject"
              title="Reject this driver?"
              reason={{ label: "What should the driver fix?", placeholder: "e.g. Licence photo is blurred", required: true }}
              confirmLabel="Reject"
              danger
            />
          )}
          {d.status === "VERIFIED" && (
            <ConfirmAction
              action={driverDecisionAction}
              fields={{ id: d.id, decision: "SUSPEND" }}
              trigger="Suspend"
              title="Suspend this driver?"
              reason={{ label: "Reason" }}
              confirmLabel="Suspend"
              danger
            />
          )}
          {d.status === "SUSPENDED" && (
            <ActionButton action={driverDecisionAction} fields={{ id: d.id, decision: "REINSTATE" }} size="md">
              Reinstate
            </ActionButton>
          )}
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Driver details" />
            <CardBody className="pt-2">
              <dl className="divide-y divide-line">
                <KeyValue label="Phone">{d.user.phone}</KeyValue>
                <KeyValue label="Email">{d.user.email}</KeyValue>
                <KeyValue label="Licence no.">{d.licenceNumber ?? "—"}</KeyValue>
                <KeyValue label="Licence expiry">{d.licenceExpiry ? formatDateLong(d.licenceExpiry) : "—"}</KeyValue>
                <KeyValue label="Permit">{d.permitNumber ?? "—"}</KeyValue>
                <KeyValue label="Experience">{d.yearsExperience != null ? `${d.yearsExperience} yrs` : "—"}</KeyValue>
                <KeyValue label="Base">{d.baseLocation?.name ?? "—"}</KeyValue>
                <KeyValue label="Languages">{d.languages ?? "—"}</KeyValue>
                <KeyValue label="Trips listed">{d._count.trips}</KeyValue>
                <KeyValue label="Submitted">{d.submittedAt ? formatDate(d.submittedAt) : "Not yet"}</KeyValue>
              </dl>
              {d.rejectionReason && <p className="mt-3 rounded-lg bg-danger-50 p-2 text-sm text-danger-700">{d.rejectionReason}</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Personal documents" />
            <CardBody className="space-y-2 pt-3">
              {d.documents.length === 0 && <p className="text-sm text-muted">No documents uploaded.</p>}
              {d.documents.map((doc) => (
                <DocLink key={doc.id} href={`/api/files/${doc.fileKey}`} label={DOC_LABEL[doc.type] ?? doc.type} status={doc.status} date={doc.createdAt} />
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="History" />
            <CardBody className="pt-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted">No admin actions yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {history.map((h) => (
                    <li key={h.id}>
                      <span className="font-semibold">{h.action.replace(/_/g, " ").toLowerCase()}</span> by {h.admin.name}
                      <span className="block text-xs text-muted">
                        {formatDateTime(h.createdAt)}
                        {h.note ? ` — ${h.note}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          {d.vehicles.map((v) => (
            <Card key={v.id}>
              <CardBody>
                <div className="grid gap-5 md:grid-cols-[280px_1fr]">
                  <VehicleVisual type={v.type} model={v.model} color={v.color} hasCarrier={v.hasCarrier} photos={v.photoKeys.map((k) => `/api/files/${k}`)} />
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-bold">{v.model}</p>
                        <p className="font-mono text-sm">{v.registrationNumber}</p>
                      </div>
                      <StatusBadge status={v.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{VEHICLE_TYPE_LABELS[v.type]}</Badge>
                      <Badge>{v.seatCapacity} seats</Badge>
                      {v.color && <Badge>{v.color}</Badge>}
                    </div>
                    <div className="mt-4 space-y-2">
                      {v.documents.map((doc) => (
                        <DocLink key={doc.id} href={`/api/files/${doc.fileKey}`} label={DOC_LABEL[doc.type] ?? doc.type} status={doc.status} date={doc.createdAt} />
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {v.status !== "APPROVED" && (
                        <ActionButton action={vehicleDecisionAction} fields={{ id: v.id, decision: "APPROVE" }} variant="primary">
                          Approve vehicle
                        </ActionButton>
                      )}
                      {v.status !== "REJECTED" && (
                        <ConfirmAction
                          action={vehicleDecisionAction}
                          fields={{ id: v.id, decision: "REJECT" }}
                          trigger="Reject vehicle"
                          size="sm"
                          title="Reject this vehicle?"
                          reason={{ label: "Reason", placeholder: "e.g. Insurance expired", required: true }}
                          confirmLabel="Reject"
                          danger
                        />
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
          {d.vehicles.length === 0 && <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">No vehicles added.</p>}
        </div>
      </div>
    </>
  );
}

function DocLink({ href, label, status, date }: { href: string; label: string; status: string; date: Date }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 text-sm hover:border-forest-300">
      <span className="flex items-center gap-2">
        <FileText className="size-4 text-muted" aria-hidden />
        <span>
          <span className="font-semibold">{label}</span>
          <span className="block text-xs text-muted">Uploaded {formatDate(date)}</span>
        </span>
      </span>
      <span className="flex items-center gap-2">
        <StatusBadge status={status} />
        <ExternalLink className="size-3.5 text-muted" aria-hidden />
      </span>
    </a>
  );
}
