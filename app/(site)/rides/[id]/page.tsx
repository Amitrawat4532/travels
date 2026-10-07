import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ArrowLeft, CalendarDays, Car, Clock, Languages, Luggage, Route, ShieldCheck, Snowflake, Star } from "lucide-react";
import { getRideDetail } from "@/server/queries/rides";
import { getCurrentUser } from "@/auth/session";
import { track } from "@/server/analytics";
import { cancellationPolicyText, segmentFarePaise } from "@/server/services/bookings";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Rating, Skeleton, Stars, KeyValue } from "@/components/ui/misc";
import { Badge, VerifiedBadge } from "@/components/ui/badge";
import { SeatPicker } from "@/features/rides/seat-picker";
import { StopTimeline } from "@/features/rides/stop-timeline";
import { driverAvatarSrc } from "@/features/rides/ride-card";
import { BOOKING_CUTOFF_MINUTES, VEHICLE_TYPE_LABELS } from "@/lib/constants";
import { formatDateLong, formatDuration, formatPaise, formatTime, relativeDayLabel, timeAgo } from "@/lib/format";
import { maskVehicleNumber, routeKey } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ride details",
  description: "Driver, vehicle, route, boarding points and live seat availability for this shared taxi ride.",
};

export default function RidePage(props: PageProps<"/rides/[id]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<RideSkeleton />}>
        <RideContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function RideSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-72" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-[520px]" />
    </div>
  );
}

async function RideContent({
  params,
  searchParams,
}: {
  params: PageProps<"/rides/[id]">["params"];
  searchParams: PageProps<"/rides/[id]">["searchParams"];
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await connection();
  const [trip, user] = await Promise.all([getRideDetail(id), getCurrentUser()]);
  if (!trip) notFound();

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const fromSlug = one(sp.from);
  const toSlug = one(sp.to);
  const passengers = Math.min(Math.max(Number(one(sp.passengers)) || 1, 1), 6);

  const stops = trip.stops;
  let boarding = stops.find((s) => s.location.slug === fromSlug) ?? stops[0]!;
  let drop = stops.find((s) => s.location.slug === toSlug) ?? stops[stops.length - 1]!;
  if (boarding.sequence >= drop.sequence) {
    boarding = stops[0]!;
    drop = stops[stops.length - 1]!;
  }
  const farePaise = segmentFarePaise(boarding, drop);
  const available = trip.seats.filter((s) => s.status === "AVAILABLE").length;
  const now = new Date();

  track({
    type: "RIDE_VIEW",
    userId: user?.id,
    tripId: trip.id,
    routeKey: routeKey(trip.route.origin.slug, trip.route.destination.slug),
  });

  let closedReason: string | undefined;
  if (trip.status === "CANCELLED") closedReason = "The driver cancelled this ride.";
  else if (trip.status === "COMPLETED") closedReason = "This ride is completed.";
  else if (trip.status === "IN_PROGRESS" || trip.departureAt.getTime() - BOOKING_CUTOFF_MINUTES * 60_000 <= now.getTime())
    closedReason = "Booking is closed — this ride departs soon or has left.";
  else if (trip.driver.status !== "VERIFIED") closedReason = "This ride is not available right now.";
  else if (available === 0) closedReason = "All seats are booked. Try another ride on this route.";
  else if (user && user.role !== "PASSENGER") closedReason = `You're logged in as ${user.role.toLowerCase()}. Log in with a passenger account to book.`;
  const bookable = !closedReason;

  const d = trip.driver;
  const segmentMinutes = Math.round((drop.scheduledAt.getTime() - boarding.scheduledAt.getTime()) / 60_000);
  const backHref = `/search?from=${boarding.location.slug}&to=${drop.location.slug}&passengers=${passengers}`;

  return (
    <>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Back to results
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* Summary */}
          <Card>
            <CardBody>
              <p className="text-xs font-bold tracking-wider text-forest-600 uppercase">
                {trip.route.origin.name} → {trip.route.destination.name}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {boarding.location.name} → {drop.location.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-ink-2">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-forest-600" aria-hidden />
                  {relativeDayLabel(boarding.scheduledAt, now)}, {formatDateLong(boarding.scheduledAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4 text-forest-600" aria-hidden />
                  {formatTime(boarding.scheduledAt)} → {formatTime(drop.scheduledAt)} ({formatDuration(segmentMinutes)})
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge tone={available > 2 ? "green" : available > 0 ? "amber" : "red"}>
                  {available} of {trip.totalSeats} seats available
                </Badge>
                <Badge tone="dark">{formatPaise(farePaise)} / seat</Badge>
                {trip.status !== "SCHEDULED" && <Badge tone="red">{trip.status.replace("_", " ").toLowerCase()}</Badge>}
              </div>
            </CardBody>
          </Card>

          {/* Route */}
          <Card>
            <CardHeader title="Route & stops" description="Board and drop points are highlighted. You can change them on the next step." />
            <CardBody>
              <StopTimeline
                stops={stops.map((s) => ({ id: s.id, name: s.location.name, point: s.pointName, at: s.scheduledAt, fareFromOriginPaise: s.fareFromOriginPaise }))}
                boardingId={boarding.id}
                dropId={drop.id}
              />
              {trip.notes && <p className="mt-5 rounded-xl bg-paper p-3 text-sm text-ink-2">📝 {trip.notes}</p>}
            </CardBody>
          </Card>

          {/* Driver */}
          <Card>
            <CardHeader title="Your driver" />
            <CardBody>
              <div className="flex items-start gap-4">
                <Avatar name={d.user.name} src={driverAvatarSrc(d.id, d.user.avatarKey)} size={64} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">{d.user.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {d.status === "VERIFIED" && <VerifiedBadge />}
                    <Rating value={d.ratingAvg} count={d.ratingCount} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-muted">Completed trips</dt>
                      <dd className="font-semibold">{d.completedTrips}</dd>
                    </div>
                    {d.yearsExperience != null && (
                      <div>
                        <dt className="text-muted">Experience</dt>
                        <dd className="font-semibold">{d.yearsExperience} years</dd>
                      </div>
                    )}
                    {d.languages && (
                      <div>
                        <dt className="flex items-center gap-1 text-muted">
                          <Languages className="size-3.5" aria-hidden /> Speaks
                        </dt>
                        <dd className="font-semibold">{d.languages}</dd>
                      </div>
                    )}
                  </dl>
                  {d.bio && <p className="mt-3 text-sm text-ink-2 italic">&ldquo;{d.bio}&rdquo;</p>}
                </div>
              </div>
              {d.status === "VERIFIED" && (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-forest-50 p-3 text-sm text-forest-800">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Driving licence, vehicle RC, insurance and taxi permit verified by Pahadi Seat.
                </p>
              )}
              <p className="mt-3 text-xs text-muted">Driver&apos;s phone number is shared after your booking is confirmed.</p>
            </CardBody>
          </Card>

          {/* Vehicle */}
          <Card>
            <CardHeader title="Vehicle" />
            <CardBody className="pt-3">
              <div className="flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                  <Car className="size-6" aria-hidden />
                </span>
                <div>
                  <p className="font-bold">
                    {trip.vehicle.model} <span className="font-normal text-muted">· {VEHICLE_TYPE_LABELS[trip.vehicle.type]}</span>
                  </p>
                  <p className="font-mono text-sm text-muted">
                    {maskVehicleNumber(trip.vehicle.registrationNumber)}
                    {trip.vehicle.color && <span className="font-sans"> · {trip.vehicle.color}</span>}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>{trip.totalSeats} passenger seats</Badge>
                {trip.vehicle.isAc && (
                  <Badge tone="blue">
                    <Snowflake className="size-3" aria-hidden /> AC
                  </Badge>
                )}
                {trip.vehicle.hasCarrier && (
                  <Badge>
                    <Luggage className="size-3" aria-hidden /> Roof carrier for luggage
                  </Badge>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Policy */}
          <Card>
            <CardHeader title="Cancellation policy" />
            <CardBody className="pt-2 text-sm leading-relaxed text-ink-2">
              {cancellationPolicyText(trip.cancellationHours)}
              <dl className="mt-3 divide-y divide-line border-t border-line">
                <KeyValue label="Payment">Pay the driver at boarding (Cash / UPI)</KeyValue>
                <KeyValue label="Booking closes">{BOOKING_CUTOFF_MINUTES} min before departure</KeyValue>
              </dl>
            </CardBody>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  <Star className="size-4 fill-marigold-400 text-marigold-400" aria-hidden /> Passenger reviews
                </span>
              }
              description={d.ratingCount ? `${d.ratingAvg.toFixed(1)} average from ${d.ratingCount} ratings` : undefined}
            />
            <CardBody>
              {d.reviews.length === 0 ? (
                <p className="text-sm text-muted">No reviews yet — this driver is new on Pahadi Seat.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {d.reviews.map((r) => (
                    <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{r.user.name.split(" ")[0]}</p>
                        <span className="text-xs text-muted">{timeAgo(r.createdAt, now)}</span>
                      </div>
                      <Stars value={r.rating} size={14} />
                      {r.comment && <p className="mt-1 text-sm text-ink-2">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Booking panel */}
        <aside className="lg:sticky lg:top-20" aria-label="Select seats">
          <Card>
            <CardHeader
              title="Select seats"
              description={
                <span className="inline-flex items-center gap-1">
                  <Route className="size-3.5" aria-hidden /> {boarding.location.name} → {drop.location.name} · {formatPaise(farePaise)} each
                </span>
              }
            />
            <CardBody>
              <SeatPicker
                tripId={trip.id}
                seats={trip.seats}
                farePaise={farePaise}
                initialCount={Math.min(passengers, available)}
                fromSlug={boarding.location.slug}
                toSlug={drop.location.slug}
                bookable={bookable}
                closedReason={closedReason}
                loginHref={user ? undefined : "/login?next="}
              />
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
