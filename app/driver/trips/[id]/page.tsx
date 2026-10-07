import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, MessageCircle, Pencil, Phone, Play, XCircle } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { getDriverContext, getDriverTrip, seatCounts } from "@/server/queries/driver";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/misc";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { ActionButton } from "@/components/ui/action-button";
import { StopTimeline } from "@/features/rides/stop-timeline";
import { DriverSeatMap } from "@/features/driver/driver-seat-map";
import { cancelTripAction, completeTripAction, setBoardingAction, startTripAction } from "@/features/driver/actions";
import { formatDateLong, formatPaise, formatTime } from "@/lib/format";
import { initials, pluralize, telLink, whatsappLink } from "@/lib/utils";

export default function DriverTripPage(props: PageProps<"/driver/trips/[id]">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({
  params,
  searchParams,
}: {
  params: PageProps<"/driver/trips/[id]">["params"];
  searchParams: PageProps<"/driver/trips/[id]">["searchParams"];
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requirePageUser(["DRIVER"], `/driver/trips/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const driver = await getDriverContext(user.id);
  if (!driver) redirect("/driver/onboarding");
  const trip = await getDriverTrip(driver.id, id);
  if (!trip) notFound();

  const now = new Date();
  const c = seatCounts(trip);
  const active = trip.bookings.filter((b) => b.status === "CONFIRMED" || b.status === "PENDING" || b.status === "COMPLETED");
  const cancelled = trip.bookings.filter((b) => b.status === "CANCELLED" || b.status === "REFUNDED");
  const scheduled = trip.status === "SCHEDULED";
  const departed = trip.departureAt <= now;
  const canStart = scheduled && trip.departureAt.getTime() - now.getTime() <= 2 * 3_600_000;
  const canComplete = (scheduled || trip.status === "IN_PROGRESS") && departed;
  const canBoard = (scheduled || trip.status === "IN_PROGRESS") && trip.departureAt.getTime() - now.getTime() <= 3 * 3_600_000;
  const fareValue = active.reduce((n, b) => n + b.fareTotalPaise, 0);

  const seatLabels: Record<number, string> = {};
  for (const b of active) for (const p of b.passengers) seatLabels[p.seatNumber] = initials(p.name);

  const boardingAt = new Map<string, number>();
  const droppingAt = new Map<string, number>();
  for (const b of active) {
    if (b.status === "CANCELLED") continue;
    boardingAt.set(b.boardingStopId, (boardingAt.get(b.boardingStopId) ?? 0) + b.seatCount);
    droppingAt.set(b.dropStopId, (droppingAt.get(b.dropStopId) ?? 0) + b.seatCount);
  }

  return (
    <>
      <Link href="/driver/trips" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> My trips
      </Link>
      {sp.published === "1" && (
        <Alert tone="success" title="Ride published 🎉" className="mb-5">
          Your ride is now searchable. You&apos;ll get a notification for every new booking.
        </Alert>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight uppercase sm:text-[28px]">
              {trip.route.origin.name} → {trip.route.destination.name}
            </h1>
            <StatusBadge status={trip.status} />
          </div>
          <p className="mt-1 text-muted">
            {formatDateLong(trip.departureAt)} · <strong className="text-ink">{formatTime(trip.departureAt)}</strong> · {trip.vehicle.model} (
            {trip.vehicle.registrationNumber})
          </p>
          {trip.cancelReason && <p className="mt-1 text-sm text-danger-700">Cancelled: {trip.cancelReason}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {scheduled && (
            <LinkButton href={`/driver/trips/${trip.id}/edit`} variant="outline">
              <Pencil className="size-4" aria-hidden /> Update trip
            </LinkButton>
          )}
          {canStart && (
            <ActionButton action={startTripAction} fields={{ tripId: trip.id }} variant="secondary" size="md">
              <Play className="size-4" aria-hidden /> Start trip
            </ActionButton>
          )}
          {canComplete && (
            <ConfirmAction
              action={completeTripAction}
              fields={{ tripId: trip.id }}
              variant="primary"
              trigger={
                <>
                  <CheckCircle2 className="size-4" aria-hidden /> Mark trip completed
                </>
              }
              title="Mark this trip completed?"
              description="All confirmed bookings will be marked completed and passengers will be asked to rate you."
              confirmLabel="Yes, trip completed"
            />
          )}
          {scheduled && (
            <ConfirmAction
              action={cancelTripAction}
              fields={{ tripId: trip.id }}
              trigger={
                <>
                  <XCircle className="size-4" aria-hidden /> Cancel trip
                </>
              }
              triggerClassName="text-danger-700"
              title="Cancel this trip?"
              description={
                active.length
                  ? `${pluralize(active.length, "booking")} (${c.booked} seats) will be cancelled and passengers notified. Frequent cancellations lower your ranking.`
                  : "No one has booked yet. The ride will be removed from search."
              }
              reason={{ label: "Reason for passengers", placeholder: "e.g. Vehicle breakdown / road closed near Devprayag", required: true }}
              confirmLabel="Cancel trip"
              danger
            />
          )}
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Total", c.total],
              ["Booked", c.booked],
              ["Available", c.available],
              ["Fare value", formatPaise(fareValue)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-line bg-white p-4 shadow-card">
                <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader title="Passenger list" description="Who boards where — and where each person needs to get off." />
            <CardBody>
              {active.length === 0 ? (
                <EmptyState title="No bookings yet" description="Passengers searching your route will see this ride. Share it on your WhatsApp groups too!" />
              ) : (
                <ul className="divide-y divide-line">
                  {active.map((b) => {
                    const payment = b.payments[0];
                    return (
                      <li key={b.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[15px] font-bold">
                              {b.user.name}{" "}
                              <span className="font-medium text-muted">
                                · {pluralize(b.seatCount, "seat")} ({b.seatNumbers.join(", ")})
                              </span>
                            </p>
                            {b.passengers.length > 1 && (
                              <p className="text-xs text-muted">With: {b.passengers.slice(1).map((p) => p.name).join(", ")}</p>
                            )}
                            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm">
                              <span className="inline-flex items-center gap-1 text-forest-700">
                                <ArrowUp className="size-3.5" aria-hidden /> {b.boardingStop.pointName}
                              </span>
                              <span className="text-muted">→</span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-marigold-50 px-1.5 font-semibold text-marigold-700">
                                <ArrowDown className="size-3.5" aria-hidden /> Drop: {b.dropStop.location.name} ({b.dropStop.pointName})
                              </span>
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <StatusBadge status={b.status} />
                              {b.boardingStatus !== "NOT_BOARDED" && <StatusBadge status={b.boardingStatus} />}
                              <Badge tone={payment?.status === "PAID" ? "green" : "amber"}>
                                {payment?.status === "PAID" ? "Paid" : `Collect ${formatPaise(b.totalPaise)}`}
                              </Badge>
                              <span className="font-mono text-xs text-muted">{b.code}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <a href={telLink(b.contactPhone)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-forest-700 px-3 text-sm font-semibold text-white" aria-label={`Call ${b.user.name}`}>
                              <Phone className="size-4" aria-hidden /> <span className="hidden sm:inline">{b.contactPhone}</span>
                            </a>
                            <a
                              href={whatsappLink(b.contactPhone, `Namaste ${b.user.name.split(" ")[0]} ji, main aapka driver hoon (${b.code}). Pickup: ${b.boardingStop.pointName}, ${formatTime(b.boardingStop.scheduledAt)}.`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex size-10 items-center justify-center rounded-xl bg-[#e7f6ec] text-[#136c3a]"
                              aria-label={`WhatsApp ${b.user.name}`}
                            >
                              <MessageCircle className="size-4" aria-hidden />
                            </a>
                          </div>
                        </div>
                        {canBoard && b.status === "CONFIRMED" && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {b.boardingStatus !== "BOARDED" && (
                              <>
                                <ActionButton action={setBoardingAction} fields={{ bookingId: b.id, status: "BOARDED", paid: "true" }} variant="secondary">
                                  ✓ Boarded & paid
                                </ActionButton>
                                <ActionButton action={setBoardingAction} fields={{ bookingId: b.id, status: "BOARDED", paid: "false" }}>
                                  Boarded (pay later)
                                </ActionButton>
                              </>
                            )}
                            {b.boardingStatus !== "NO_SHOW" && b.boardingStatus !== "BOARDED" && (
                              <ActionButton action={setBoardingAction} fields={{ bookingId: b.id, status: "NO_SHOW" }} variant="ghost">
                                No-show
                              </ActionButton>
                            )}
                            {b.boardingStatus === "BOARDED" && payment?.status !== "PAID" && (
                              <ActionButton action={setBoardingAction} fields={{ bookingId: b.id, status: "BOARDED", paid: "true" }} variant="secondary">
                                Mark paid
                              </ActionButton>
                            )}
                            {b.boardingStatus !== "NOT_BOARDED" && (
                              <ActionButton action={setBoardingAction} fields={{ bookingId: b.id, status: "NOT_BOARDED" }} variant="ghost">
                                Undo
                              </ActionButton>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {cancelled.length > 0 && (
                <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
                  {pluralize(cancelled.length, "cancelled booking")} — seats were released automatically.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Stop plan" description="How many passengers get in and out at each stop." />
            <CardBody>
              <StopTimeline
                stops={trip.stops.map((s) => ({ id: s.id, name: s.location.name, point: s.pointName, at: s.scheduledAt, fareFromOriginPaise: s.fareFromOriginPaise }))}
                showFares
                annotate={(s) => {
                  const up = boardingAt.get(s.id) ?? 0;
                  const down = droppingAt.get(s.id) ?? 0;
                  if (!up && !down) return null;
                  return (
                    <p className="mt-1 flex gap-3 text-xs font-semibold">
                      {up > 0 && <span className="text-forest-700">↑ {up} boarding</span>}
                      {down > 0 && <span className="text-marigold-700">↓ {down} getting down</span>}
                    </p>
                  );
                }}
              />
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <Card>
            <CardHeader title="Seats" />
            <CardBody>
              <DriverSeatMap tripId={trip.id} seats={trip.seats} labels={seatLabels} editable={scheduled} />
            </CardBody>
          </Card>
          {trip.notes && (
            <Card>
              <CardBody className="text-sm text-ink-2">📝 {trip.notes}</CardBody>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
