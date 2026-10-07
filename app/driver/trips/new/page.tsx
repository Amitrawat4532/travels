import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/auth/guards";
import { getDriverContext } from "@/server/queries/driver";
import { db } from "@/server/db";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { DriverStatusBanner } from "@/features/driver/components";
import { TripForm, type RouteOption } from "@/features/driver/trip-form";

export default function NewTripPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requirePageUser(["DRIVER"], "/driver/trips/new");
  const driver = await getDriverContext(user.id);
  if (!driver) redirect("/driver/onboarding");

  if (driver.status !== "VERIFIED") {
    return (
      <>
        <PageHeader title="Create Trip" />
        <DriverStatusBanner status={driver.status} reason={driver.rejectionReason} />
        <EmptyState title="Verification required" description="A driver cannot publish public rides until verified. This keeps passengers safe." />
      </>
    );
  }
  const vehicles = driver.vehicles.filter((v) => v.status === "APPROVED" && v.isActive);
  if (vehicles.length === 0) {
    return (
      <>
        <PageHeader title="Create Trip" />
        <EmptyState
          title="No approved vehicle yet"
          description="Add your vehicle with RC and insurance. Once approved you can publish rides."
          action={<LinkButton href="/driver/vehicles">Manage vehicles</LinkButton>}
        />
      </>
    );
  }

  const routes = await db.route.findMany({
    where: { isActive: true },
    include: { origin: true, destination: true, stops: { include: { location: true }, orderBy: { sequence: "asc" } } },
    orderBy: [{ isPopular: "desc" }, { createdAt: "asc" }],
  });
  // Suggest boarding / drop landmarks this route's drivers commonly use.
  const recent = await db.trip.findMany({
    where: { routeId: { in: routes.map((r) => r.id) } },
    select: { routeId: true, boardingPoint: true, dropPoint: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const routeOptions: RouteOption[] = routes.map((r) => {
    const mine = recent.filter((t) => t.routeId === r.id);
    const uniq = (xs: string[]) => [...new Set(xs)].slice(0, 6);
    return {
      id: r.id,
      origin: r.origin.name,
      destination: r.destination.name,
      durationMinutes: r.durationMinutes,
      distanceKm: r.distanceKm,
      suggestedFarePaise: r.suggestedFarePaise,
      boardingSuggestions: uniq([...mine.map((t) => t.boardingPoint), `${r.origin.name} Bus Stand`]),
      dropSuggestions: uniq([...mine.map((t) => t.dropPoint), `${r.destination.name} Bus Stand`]),
      stops: r.stops.map((s) => ({
        locationId: s.locationId,
        name: s.location.name,
        minutesFromOrigin: s.minutesFromOrigin,
        distanceFromOriginKm: s.distanceFromOriginKm,
      })),
    };
  });

  return (
    <>
      <PageHeader title="Create Trip" description="Gaadi waise bhi ja rahi hai — list the trip and fill your empty seats." />
      <TripForm
        routes={routeOptions}
        vehicles={vehicles.map((v) => ({
          id: v.id,
          model: v.model,
          type: v.type,
          registrationNumber: v.registrationNumber,
          seatCapacity: v.seatCapacity,
          color: v.color,
          hasCarrier: v.hasCarrier,
          photos: v.photoKeys.map((k) => `/api/files/${k}`),
        }))}
      />
    </>
  );
}
