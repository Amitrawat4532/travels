import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { getRideDetail } from "@/server/queries/rides";
import { requirePageUser } from "@/auth/guards";
import { BookingForm } from "@/features/booking/booking-form";
import { Skeleton, EmptyState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { VEHICLE_TYPE_LABELS } from "@/lib/constants";
import { getPaymentProvider } from "@/server/payments";
import { cancellationPolicyText, isBookingWindowOpen } from "@/server/services/bookings";

export const metadata: Metadata = { title: "Complete booking", robots: { index: false } };

export default function BookPage(props: PageProps<"/book/[tripId]">) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <BookContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function BookContent({
  params,
  searchParams,
}: {
  params: PageProps<"/book/[tripId]">["params"];
  searchParams: PageProps<"/book/[tripId]">["searchParams"];
}) {
  const { tripId } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(tripId)) notFound();
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const qs = new URLSearchParams({ seats: one(sp.seats), from: one(sp.from), to: one(sp.to) });
  const user = await requirePageUser(["PASSENGER"], `/book/${tripId}?${qs}`);
  await connection();

  const trip = await getRideDetail(tripId);
  if (!trip) notFound();

  const requested = one(sp.seats)
    .split(",")
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n > 0);
  const seatSet = new Set(requested);
  const backHref = `/rides/${trip.id}?from=${one(sp.from)}&to=${one(sp.to)}`;
  if (seatSet.size === 0) redirect(backHref);

  const open =
    trip.status === "SCHEDULED" &&
    trip.driver.status === "VERIFIED" &&
    isBookingWindowOpen(trip.departureAt);
  if (!open) {
    return (
      <EmptyState
        title="Booking is closed for this ride"
        description="It may have been cancelled or is departing too soon. Please choose another ride."
        action={<LinkButton href="/search">Find another ride</LinkButton>}
      />
    );
  }

  const taken = trip.seats.filter((s) => seatSet.has(s.seatNumber) && s.status !== "AVAILABLE").map((s) => s.seatNumber);
  const missing = [...seatSet].filter((n) => n > trip.totalSeats);
  if (taken.length || missing.length) {
    return (
      <EmptyState
        title={`Seat ${[...taken, ...missing].join(", ")} is no longer available`}
        description="Someone booked it a moment ago. Please pick other seats — availability is live."
        action={<LinkButton href={backHref}>Choose seats again</LinkButton>}
      />
    );
  }

  const stops = trip.stops.map((s) => ({
    id: s.id,
    sequence: s.sequence,
    name: s.location.name,
    slug: s.location.slug,
    point: s.pointName,
    at: s.scheduledAt.toISOString(),
    farePaise: s.fareFromOriginPaise,
  }));
  const boarding = stops.find((s) => s.slug === one(sp.from)) ?? stops[0]!;
  const drop = stops.find((s) => s.slug === one(sp.to) && s.sequence > boarding.sequence) ?? stops[stops.length - 1]!;

  return (
    <>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Change seats
      </Link>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Complete your booking</h1>
      <p className="mt-1 text-muted">Bas thodi si details — phir seat pakki.</p>
      <BookingForm
        tripId={trip.id}
        seats={[...seatSet].sort((a, b) => a - b)}
        stops={stops}
        defaultBoardingId={boarding.id}
        defaultDropId={drop.id}
        user={{ name: user.name, phone: user.phone }}
        driverName={trip.driver.user.name}
        vehicleLabel={`${trip.vehicle.model} (${VEHICLE_TYPE_LABELS[trip.vehicle.type]})`}
        routeLabel={`${trip.route.origin.name} → ${trip.route.destination.name}`}
        paymentLabel={getPaymentProvider().label}
        policy={cancellationPolicyText(trip.cancellationHours)}
      />
    </>
  );
}
