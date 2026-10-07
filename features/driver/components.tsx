import Link from "next/link";
import { ArrowRight, Clock3, FileWarning, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import type { DriverStatus } from "@prisma/client";
import { Alert } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatShortDay, formatTime, formatPaise } from "@/lib/format";
import { cn, pluralize } from "@/lib/utils";
import { seatCounts, type DriverTripCard } from "@/server/queries/driver";

export function DriverStatusBanner({ status, reason }: { status: DriverStatus; reason?: string | null }) {
  if (status === "VERIFIED") return null;
  if (status === "DRAFT") {
    return (
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-marigold-100 bg-marigold-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <FileWarning className="mt-0.5 size-6 shrink-0 text-marigold-700" aria-hidden />
          <div>
            <p className="font-bold text-marigold-700">Complete your driver registration</p>
            <p className="text-sm text-marigold-700/80">Upload your licence and vehicle documents. Verified drivers can publish rides.</p>
          </div>
        </div>
        <LinkButton href="/driver/onboarding" variant="primary">
          Submit documents <ArrowRight className="size-4" aria-hidden />
        </LinkButton>
      </div>
    );
  }
  if (status === "PENDING") {
    return (
      <Alert tone="info" className="mb-6" title="Verification in progress">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="size-4" aria-hidden /> Our team is checking your documents — usually within 24 hours. You&apos;ll get a
          notification once approved.
        </span>
      </Alert>
    );
  }
  if (status === "REJECTED") {
    return (
      <div className="mb-6 rounded-3xl border border-danger-500/30 bg-danger-50 p-5">
        <p className="flex items-center gap-2 font-bold text-danger-700">
          <ShieldAlert className="size-5" aria-hidden /> Verification not approved
        </p>
        {reason && <p className="mt-1 text-sm text-danger-700">{reason}</p>}
        <LinkButton href="/driver/onboarding" variant="danger" size="sm" className="mt-3">
          Fix & resubmit documents
        </LinkButton>
      </div>
    );
  }
  return (
    <Alert tone="error" className="mb-6" title="Account suspended">
      You cannot publish rides right now. Please contact support.
    </Alert>
  );
}

export function VerifiedPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-700 ring-1 ring-forest-200">
      <ShieldCheck className="size-3.5" aria-hidden /> ✓ Verified Driver
    </span>
  );
}

export function DriverTripCardView({ trip, showPassengers = true }: { trip: DriverTripCard; showPassengers?: boolean }) {
  const d = formatShortDay(trip.departureAt);
  const c = seatCounts(trip);
  const active = trip.bookings.filter((b) => b.status !== "CANCELLED");
  const earnings = active.reduce((n, b) => n + b.fareTotalPaise, 0);
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <Link href={`/driver/trips/${trip.id}`} className="block p-4 hover:bg-paper/50 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-forest-800 py-2 text-white">
            <span className="text-2xl leading-none font-extrabold">{d.day}</span>
            <span className="mt-0.5 text-[11px] font-bold tracking-wider text-forest-200">{d.month}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[15px] font-extrabold tracking-wide uppercase sm:text-base">
                {trip.route.origin.name} → {trip.route.destination.name}
              </p>
              <StatusBadge status={trip.status} />
            </div>
            <p className="mt-0.5 text-sm text-muted">
              <strong className="text-ink">{formatTime(trip.departureAt)}</strong> · {trip.vehicle.model} · {trip.boardingPoint}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:max-w-sm">
              <SeatStat label="Total" value={c.total} />
              <SeatStat label="Booked" value={c.booked} tone="green" />
              <SeatStat label="Available" value={c.available} tone={c.available === 0 ? "red" : "neutral"} />
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs text-muted">Fare value</p>
            <p className="text-lg font-bold">{formatPaise(earnings)}</p>
          </div>
        </div>
      </Link>
      {showPassengers && active.length > 0 && (
        <div className="border-t border-line bg-paper/50 px-4 py-3 sm:px-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted uppercase">
            <Users className="size-3.5" aria-hidden /> {pluralize(active.length, "booking")}
          </p>
          <ul className="space-y-1.5">
            {active.slice(0, 5).map((b) => (
              <li key={b.id} className="grid grid-cols-[1fr_auto] gap-2 text-sm sm:grid-cols-[1.2fr_0.5fr_1.5fr_auto]">
                <span className="truncate font-semibold">{b.user.name}</span>
                <span className="text-muted sm:order-none">{pluralize(b.seatCount, "seat")}</span>
                <span className="col-span-2 truncate text-xs text-muted sm:col-span-1 sm:text-sm">
                  {b.boardingStop.location.name} → <strong className="text-ink">{b.dropStop.location.name}</strong>
                </span>
                <span className="hidden sm:block">
                  <StatusBadge status={b.status} />
                </span>
              </li>
            ))}
          </ul>
          {active.length > 5 && (
            <Link href={`/driver/trips/${trip.id}`} className="mt-2 inline-block text-sm font-semibold text-forest-700">
              +{active.length - 5} more →
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

function SeatStat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "green" | "red" }) {
  return (
    <div
      className={cn(
        "rounded-xl px-2 py-1.5",
        tone === "green" ? "bg-forest-50 text-forest-800" : tone === "red" ? "bg-danger-50 text-danger-700" : "bg-paper-2 text-ink",
      )}
    >
      <p className="text-lg leading-tight font-extrabold tabular-nums">{value}</p>
      <p className="text-[11px] font-medium opacity-75">{label}</p>
    </div>
  );
}
