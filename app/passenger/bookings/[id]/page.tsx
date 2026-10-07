import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, MessageCircle, Phone, Star, XCircle } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { getPassengerBooking } from "@/server/queries/bookings";
import { cancellationPolicyText, computeRefundPaise } from "@/server/services/bookings";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, Avatar, KeyValue, Rating, Stars } from "@/components/ui/misc";
import { StatusBadge, VerifiedBadge } from "@/components/ui/badge";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { PrintButton } from "@/components/ui/print-button";
import { StopTimeline } from "@/features/rides/stop-timeline";
import { ReviewForm } from "@/features/booking/review-form";
import { ComplaintForm } from "@/features/booking/complaint-form";
import { cancelBookingAction } from "@/features/passenger/actions";
import { VEHICLE_TYPE_LABELS } from "@/lib/constants";
import { formatDateLong, formatDateTime, formatPaise, formatTime } from "@/lib/format";
import { telLink, whatsappLink } from "@/lib/utils";

export default function BookingDetailPage(props: PageProps<"/passenger/bookings/[id]">) {
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
  params: PageProps<"/passenger/bookings/[id]">["params"];
  searchParams: PageProps<"/passenger/bookings/[id]">["searchParams"];
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requirePageUser(["PASSENGER"], `/passenger/bookings/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const booking = await getPassengerBooking(user.id, id);
  if (!booking) notFound();

  const { trip } = booking;
  const now = new Date();
  const isNew = sp.new === "1";
  const active = booking.status === "CONFIRMED" || booking.status === "PENDING";
  const upcoming = trip.departureAt > now && trip.status === "SCHEDULED";
  const canCancel = active && upcoming;
  const canContact = booking.status === "CONFIRMED" && (trip.status === "SCHEDULED" || trip.status === "IN_PROGRESS");
  const canReview = booking.status === "COMPLETED" && !booking.review && booking.boardingStatus !== "NO_SHOW";
  const payment = booking.payments[0];
  const paid = payment?.status === "PAID";
  const refundIfCancelled = computeRefundPaise(booking, trip, paid, "PASSENGER", now);
  const hoursLeft = (trip.departureAt.getTime() - now.getTime()) / 3_600_000;
  const driverPhone = trip.driver.user.phone;
  const waText = `Namaste ${trip.driver.user.name.split(" ")[0]} ji, maine Pahadi Seat pe booking ${booking.code} ki hai (${booking.boardingStop.location.name} → ${booking.dropStop.location.name}, ${formatDateTime(booking.boardingStop.scheduledAt)}, seat ${booking.seatNumbers.join(", ")}).`;

  return (
    <>
      <Link href="/passenger/bookings" className="no-print mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All bookings
      </Link>

      {isNew && booking.status === "CONFIRMED" && (
        <div className="mb-6 flex animate-fade-in items-center gap-4 rounded-3xl bg-forest-700 p-5 text-white sm:p-6">
          <CheckCircle2 className="size-12 shrink-0 text-marigold-400" aria-hidden />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Booking Confirmed</h1>
            <p className="text-forest-100">Seat pakki! Driver has been notified. Please reach the boarding point 10 minutes early.</p>
          </div>
        </div>
      )}
      {booking.status === "PENDING" && (
        <Alert tone="warning" title="Payment pending" className="mb-6">
          Your seats are held until {booking.holdExpiresAt ? formatTime(booking.holdExpiresAt) : "shortly"}. Complete the payment to confirm.
        </Alert>
      )}
      {booking.status === "CANCELLED" || booking.status === "REFUNDED" ? (
        <Alert tone="error" title={`Booking cancelled${booking.cancelledBy ? ` by ${booking.cancelledBy.toLowerCase()}` : ""}`} className="mb-6">
          {booking.cancelReason && <p>{booking.cancelReason}</p>}
          {booking.refundablePaise ? <p>Refund of {formatPaise(booking.refundablePaise)} is being processed.</p> : null}
        </Alert>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* Ticket */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-line bg-paper px-5 py-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-muted uppercase">Booking ID</p>
                <p className="font-mono text-xl font-bold tracking-wide">{booking.code}</p>
              </div>
              <StatusBadge status={booking.status} />
            </div>
            <CardBody>
              {!isNew && <h1 className="sr-only">Booking {booking.code}</h1>}
              <p className="text-xs font-bold tracking-wider text-forest-600 uppercase">
                {trip.route.origin.name} → {trip.route.destination.name}
              </p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">
                {booking.boardingStop.location.name} → {booking.dropStop.location.name}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted">Date</dt>
                  <dd className="font-semibold">{formatDateLong(booking.boardingStop.scheduledAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Departure</dt>
                  <dd className="font-semibold">{formatTime(booking.boardingStop.scheduledAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Seats</dt>
                  <dd className="font-semibold">{booking.seatNumbers.join(", ")}</dd>
                </div>
                <div>
                  <dt className="text-muted">Total</dt>
                  <dd className="font-semibold">{formatPaise(booking.totalPaise)}</dd>
                </div>
              </dl>
              <dl className="mt-5 divide-y divide-line border-t border-line">
                <KeyValue label="Boarding point">
                  {booking.boardingStop.pointName}
                  <span className="block text-xs font-normal text-muted">{formatTime(booking.boardingStop.scheduledAt)}</span>
                </KeyValue>
                <KeyValue label="Drop point">
                  {booking.dropStop.pointName}
                  <span className="block text-xs font-normal text-muted">approx. {formatTime(booking.dropStop.scheduledAt)}</span>
                </KeyValue>
                <KeyValue label="Driver">{trip.driver.user.name}</KeyValue>
                <KeyValue label="Vehicle">
                  {trip.vehicle.model} · {VEHICLE_TYPE_LABELS[trip.vehicle.type]}
                  <span className="block font-mono text-xs font-normal text-muted">
                    {booking.status === "CONFIRMED" || booking.status === "COMPLETED" ? trip.vehicle.registrationNumber : "Shown after confirmation"}
                  </span>
                </KeyValue>
                <KeyValue label="Passengers">
                  {booking.passengers.map((p) => (
                    <span key={p.id} className="block">
                      {p.name} <span className="text-muted">· S{p.seatNumber}</span>
                    </span>
                  ))}
                </KeyValue>
                <KeyValue label={`Fare (${booking.seatCount} × ${formatPaise(booking.farePerSeatPaise)})`}>{formatPaise(booking.fareTotalPaise)}</KeyValue>
                <KeyValue label="Platform fee">{formatPaise(booking.platformFeePaise)}</KeyValue>
                <KeyValue label="Total amount">
                  <span className="text-base font-bold">{formatPaise(booking.totalPaise)}</span>
                </KeyValue>
                <KeyValue label="Payment">
                  {payment ? (
                    <>
                      <StatusBadge status={payment.status} />
                      <span className="mt-1 block text-xs font-normal text-muted">
                        {payment.method === "PAY_TO_DRIVER" ? "Pay driver at boarding (Cash / UPI)" : "Online"}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </KeyValue>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Route" />
            <CardBody>
              <StopTimeline
                stops={trip.stops.map((s) => ({ id: s.id, name: s.location.name, point: s.pointName, at: s.scheduledAt }))}
                boardingId={booking.boardingStopId}
                dropId={booking.dropStopId}
              />
            </CardBody>
          </Card>

          {canReview && (
            <Card id="review" className="no-print scroll-mt-24 border-marigold-400/60">
              <CardHeader title="Rate your driver" description="Only passengers who travelled can rate. It takes 10 seconds." />
              <CardBody>
                <ReviewForm bookingId={booking.id} driverName={trip.driver.user.name} />
              </CardBody>
            </Card>
          )}
          {booking.review && (
            <Card id="review" className="no-print">
              <CardHeader title="Your rating" />
              <CardBody className="pt-2">
                <Stars value={booking.review.rating} />
                {booking.review.comment && <p className="mt-2 text-sm text-ink-2">{booking.review.comment}</p>}
              </CardBody>
            </Card>
          )}
        </div>

        <aside className="no-print space-y-5 lg:sticky lg:top-6">
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <Avatar name={trip.driver.user.name} size={52} />
                <div>
                  <p className="font-bold">{trip.driver.user.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {trip.driver.status === "VERIFIED" && <VerifiedBadge compact />}
                    <Rating value={trip.driver.ratingAvg} count={trip.driver.ratingCount} className="text-xs" />
                  </div>
                </div>
              </div>
              {canContact ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a href={telLink(driverPhone)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-forest-700 text-sm font-semibold text-white hover:bg-forest-800">
                    <Phone className="size-4" aria-hidden /> Call
                  </a>
                  <a
                    href={whatsappLink(driverPhone, waText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#e7f6ec] text-sm font-semibold text-[#136c3a] hover:bg-[#d6efdf]"
                  >
                    <MessageCircle className="size-4" aria-hidden /> WhatsApp
                  </a>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted">Contact options are available for confirmed, upcoming trips.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2">
              <PrintButton />
              {canCancel && (
                <ConfirmAction
                  action={cancelBookingAction}
                  fields={{ bookingId: booking.id }}
                  trigger={
                    <>
                      <XCircle className="size-4" aria-hidden /> Cancel Booking
                    </>
                  }
                  triggerClassName="w-full text-danger-700"
                  title="Cancel this booking?"
                  description={
                    <div className="space-y-2">
                      <p>
                        Seat {booking.seatNumbers.join(", ")} will be released for other passengers. This cannot be undone.
                      </p>
                      <p className="rounded-lg bg-paper p-2.5">
                        {paid
                          ? `Refund: ${formatPaise(refundIfCancelled)}${hoursLeft < trip.cancellationHours ? " (late cancellation)" : " (full refund)"}`
                          : "No payment has been made, so nothing is charged."}
                      </p>
                    </div>
                  }
                  reason={{ label: "Reason (optional)", placeholder: "Plans changed / found another ride…" }}
                  confirmLabel="Yes, cancel booking"
                  danger
                />
              )}
              <p className="pt-1 text-xs leading-relaxed text-muted">{cancellationPolicyText(trip.cancellationHours)}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Need help?" />
            <CardBody className="pt-2">
              <ComplaintForm bookingId={booking.id} compact />
            </CardBody>
          </Card>

          {booking.status === "COMPLETED" && !booking.review && booking.boardingStatus === "NO_SHOW" && (
            <p className="flex items-center gap-2 text-xs text-muted">
              <Star className="size-3.5" aria-hidden /> Marked as no-show by the driver, so rating is not available.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
