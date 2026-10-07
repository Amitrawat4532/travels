import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { requirePageUser } from "@/auth/guards";
import { getDriverContext, getDriverTrip } from "@/server/queries/driver";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { PageHeader } from "@/components/ui/misc";
import { EditTripForm } from "@/features/driver/edit-trip-form";
import { toIstDateString, toIstTimeString } from "@/lib/format";

export default function EditTripPage(props: PageProps<"/driver/trips/[id]/edit">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/driver/trips/[id]/edit">["params"] }) {
  const { id } = await params;
  const user = await requirePageUser(["DRIVER"], `/driver/trips/${id}/edit`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const driver = await getDriverContext(user.id);
  if (!driver) redirect("/driver/onboarding");
  const trip = await getDriverTrip(driver.id, id);
  if (!trip) notFound();
  if (trip.status !== "SCHEDULED") redirect(`/driver/trips/${id}`);

  const highestBooked = Math.max(0, ...trip.seats.filter((s) => s.status === "BOOKED").map((s) => s.seatNumber));
  return (
    <>
      <PageHeader
        title="Update trip"
        description={`${trip.route.origin.name} → ${trip.route.destination.name}. Seats can be reduced only down to the highest booked seat number.`}
      />
      <EditTripForm
        trip={{
          id: trip.id,
          date: toIstDateString(trip.departureAt),
          time: toIstTimeString(trip.departureAt),
          durationMinutes: Math.round((trip.estimatedArrivalAt.getTime() - trip.departureAt.getTime()) / 60_000),
          boardingPoint: trip.boardingPoint,
          dropPoint: trip.dropPoint,
          totalSeats: trip.totalSeats,
          notes: trip.notes ?? "",
        }}
        minSeats={Math.max(1, highestBooked)}
        maxSeats={trip.vehicle.seatCapacity}
        hasBookings={trip.bookings.some((b) => b.status === "CONFIRMED" || b.status === "PENDING")}
      />
    </>
  );
}
