import { Suspense } from "react";
import { redirect } from "next/navigation";
import { FileText, Trash2 } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { getDriverContext } from "@/server/queries/driver";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { VehicleVisual } from "@/features/vehicles/vehicle-visual";
import { AddPhotosForm, AddVehicleForm } from "@/features/vehicles/vehicle-forms";
import { removeVehiclePhotoAction, toggleVehicleActiveAction } from "@/features/driver/actions";
import { VEHICLE_TYPE_LABELS } from "@/lib/constants";

export default function VehiclesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

const DOC_LABEL: Record<string, string> = {
  VEHICLE_RC: "RC",
  INSURANCE: "Insurance",
  PERMIT: "Permit",
};

async function Content() {
  const user = await requirePageUser(["DRIVER"], "/driver/vehicles");
  const driver = await getDriverContext(user.id);
  if (!driver) redirect("/driver/onboarding");
  if (driver.status === "DRAFT") redirect("/driver/onboarding");

  return (
    <>
      <PageHeader title="Vehicle" description="Approved vehicles can be used for trips. Real photos help passengers find you at the stand." />
      <div className="mb-6">
        <AddVehicleForm />
      </div>
      {driver.vehicles.length === 0 ? (
        <EmptyState title="No vehicles yet" description="Add your vehicle with RC and insurance to start listing rides." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {driver.vehicles.map((v) => {
            const docs = driver.documents.filter((d) => d.vehicleId === v.id);
            return (
              <Card key={v.id} className={v.isActive ? undefined : "opacity-70"}>
                <CardBody>
                  <VehicleVisual
                    type={v.type}
                    model={v.model}
                    color={v.color}
                    hasCarrier={v.hasCarrier}
                    photos={v.photoKeys.map((k) => `/api/files/${k}`)}
                  />
                  <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{v.model}</p>
                      <p className="font-mono text-sm text-muted">{v.registrationNumber}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusBadge status={v.status} />
                      {!v.isActive && <Badge>Hidden</Badge>}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{VEHICLE_TYPE_LABELS[v.type]}</Badge>
                    <Badge>{v.seatCapacity} seats</Badge>
                    {v.color && <Badge>{v.color}</Badge>}
                    {v.isAc && <Badge tone="blue">AC</Badge>}
                    {v.hasCarrier && <Badge>Carrier</Badge>}
                  </div>
                  {v.rejectionReason && <p className="mt-3 rounded-lg bg-danger-50 p-2 text-sm text-danger-700">{v.rejectionReason}</p>}
                  <div className="mt-4 flex flex-wrap gap-2 text-sm">
                    {docs.map((d) => (
                      <a
                        key={d.id}
                        href={`/api/files/${d.fileKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 hover:border-forest-300"
                      >
                        <FileText className="size-3.5 text-muted" aria-hidden /> {DOC_LABEL[d.type] ?? d.type}
                        <StatusBadge status={d.status} className="ml-1" />
                      </a>
                    ))}
                  </div>
                  {v.photoKeys.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {v.photoKeys.map((k, i) => (
                        <ActionButton key={k} action={removeVehiclePhotoAction} fields={{ vehicleId: v.id, key: k }} variant="ghost">
                          <Trash2 className="size-3.5" aria-hidden /> Photo {i + 1}
                        </ActionButton>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                    <AddPhotosForm vehicleId={v.id} remaining={6 - v.photoKeys.length} />
                    <ActionButton action={toggleVehicleActiveAction} fields={{ vehicleId: v.id }} variant="ghost">
                      {v.isActive ? "Hide from new trips" : "Make active"}
                    </ActionButton>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
