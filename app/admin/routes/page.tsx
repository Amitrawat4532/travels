import { Suspense } from "react";
import { requirePageUser } from "@/auth/guards";
import { db } from "@/server/db";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { LocationForm, NewRoutePanel, RouteForm } from "@/features/admin/route-forms";
import { toggleLocationAction, toggleRouteAction } from "@/features/admin/actions";
import { formatDuration, formatPaise } from "@/lib/format";

export default function AdminRoutesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requirePageUser(["ADMIN"], "/admin/routes");
  const [routes, locations] = await Promise.all([
    db.route.findMany({
      include: {
        origin: true,
        destination: true,
        stops: { include: { location: true }, orderBy: { sequence: "asc" } },
        _count: { select: { trips: true } },
      },
      orderBy: [{ isActive: "desc" }, { isPopular: "desc" }, { createdAt: "asc" }],
    }),
    db.location.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { tripStops: true } } } }),
  ]);
  const activeLocs = locations.filter((l) => l.isActive).map((l) => ({ id: l.id, name: l.name }));

  return (
    <>
      <PageHeader title="Routes" description="Routes power search and trip creation. Add a route to open a new corridor." action={<NewRoutePanel locations={activeLocs} />} />

      <div className="space-y-4">
        {routes.map((r) => (
          <details key={r.id} className="group rounded-2xl border border-line bg-white shadow-card">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <p className="text-lg font-bold">
                  {r.origin.name} → {r.destination.name}
                </p>
                <p className="text-sm text-muted">
                  {r.distanceKm} km · {formatDuration(r.durationMinutes)} · {formatPaise(r.suggestedFarePaise)} suggested
                  {r.stops.length > 0 && <> · via {r.stops.map((s) => s.location.name).join(", ")}</>}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {r.isPopular && <Badge tone="amber">Popular</Badge>}
                <Badge>{r._count.trips} trips</Badge>
                <StatusBadge status={r.isActive ? "ACTIVE" : "CLOSED"} />
                <span className="text-sm font-semibold text-forest-700 group-open:hidden">Edit ▾</span>
              </div>
            </summary>
            <div className="border-t border-line p-4 sm:p-5">
              <RouteForm
                locations={activeLocs}
                initial={{
                  id: r.id,
                  originId: r.originId,
                  destinationId: r.destinationId,
                  distanceKm: r.distanceKm,
                  durationMinutes: r.durationMinutes,
                  suggestedFareRupees: Math.round(r.suggestedFarePaise / 100),
                  isPopular: r.isPopular,
                  stopIds: r.stops.map((s) => s.locationId),
                }}
              />
              <div className="mt-4 border-t border-line pt-4">
                <ActionButton action={toggleRouteAction} fields={{ id: r.id }} variant={r.isActive ? "danger" : "secondary"}>
                  {r.isActive ? "Deactivate route" : "Activate route"}
                </ActionButton>
              </div>
            </div>
          </details>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader title="Locations" description="Towns passengers can search. Coordinates are optional (ready for maps later)." />
        <CardBody>
          <LocationForm />
          <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <span>
                  <span className={l.isActive ? "font-semibold" : "font-semibold text-muted line-through"}>{l.name}</span>
                  <span className="block text-xs text-muted">
                    {l.district ?? "—"} · used on {l._count.tripStops} trip stops
                  </span>
                </span>
                <ActionButton action={toggleLocationAction} fields={{ id: l.id }} variant="ghost">
                  {l.isActive ? "Hide" : "Show"}
                </ActionButton>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </>
  );
}
