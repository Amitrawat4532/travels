import Link from "next/link";
import { ArrowRight, Clock, Luggage, Snowflake, Users } from "lucide-react";
import { Avatar, Rating } from "@/components/ui/misc";
import { Badge, VerifiedBadge } from "@/components/ui/badge";
import { VEHICLE_TYPE_LABELS } from "@/lib/constants";
import { formatDuration, formatPaise, formatTime, relativeDayLabel } from "@/lib/format";
import { cn, maskVehicleNumber } from "@/lib/utils";
import type { RideSummary } from "@/server/queries/rides";

export function driverAvatarSrc(driverId: string, avatarKey: string | null) {
  return avatarKey ? `/api/avatars/${driverId}` : null;
}

export function RideCard({
  ride,
  query,
  now,
  soldOut,
}: {
  ride: RideSummary;
  query?: { from?: string; to?: string; passengers?: number };
  now: Date;
  soldOut?: boolean;
}) {
  const params = new URLSearchParams();
  if (query?.from) params.set("from", query.from);
  if (query?.to) params.set("to", query.to);
  if (query?.passengers) params.set("passengers", String(query.passengers));
  const href = `/rides/${ride.id}${params.size ? `?${params}` : ""}`;
  const durationMin = Math.round((ride.drop.at.getTime() - ride.boarding.at.getTime()) / 60_000);
  const isPartial = ride.boarding.name !== ride.routeOrigin || ride.drop.name !== ride.routeDestination;
  const low = ride.availableSeats > 0 && ride.availableSeats <= 2;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow hover:shadow-lift",
        soldOut && "opacity-70",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wider text-forest-600 uppercase">
              {ride.boarding.name} → {ride.drop.name}
            </p>
            <p className="mt-1 text-[22px] font-bold tracking-tight text-ink">
              {relativeDayLabel(ride.boarding.at, now)} · {formatTime(ride.boarding.at)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[22px] font-bold tracking-tight text-forest-800">{formatPaise(ride.farePaise)}</p>
            <p className="text-xs text-muted">per seat</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <div>
            <p className="text-sm font-semibold">{formatTime(ride.boarding.at)}</p>
            <p className="max-w-[9rem] truncate text-xs text-muted sm:max-w-[14rem]">{ride.boarding.point}</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="flex items-center gap-1 text-[11px] text-muted">
              <Clock className="size-3" aria-hidden /> {formatDuration(durationMin)}
            </span>
            <span className="relative mt-1 h-px w-full bg-forest-200">
              <span className="absolute -top-[3px] left-0 size-[7px] rounded-full bg-forest-500" />
              <span className="absolute -top-[3px] right-0 size-[7px] rounded-full border-2 border-forest-500 bg-white" />
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{formatTime(ride.drop.at)}</p>
            <p className="max-w-[9rem] truncate text-xs text-muted sm:max-w-[14rem]">{ride.drop.point}</p>
          </div>
        </div>

        {(ride.intermediateStops.length > 0 || isPartial) && (
          <p className="mt-3 text-xs text-muted">
            {ride.intermediateStops.length > 0 && (
              <>
                <span className="font-medium text-ink-2">Via</span> {ride.intermediateStops.join(" · ")}
              </>
            )}
            {isPartial && (
              <span className="text-forest-700">
                {ride.intermediateStops.length > 0 && " · "}Part of {ride.routeOrigin} → {ride.routeDestination}
              </span>
            )}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone={soldOut ? "red" : low ? "amber" : "green"}>
            <Users className="size-3.5" aria-hidden />
            {soldOut ? "Not enough seats" : `${ride.availableSeats} of ${ride.totalSeats} seats left`}
          </Badge>
          <Badge>{VEHICLE_TYPE_LABELS[ride.vehicle.type]}</Badge>
          {ride.vehicle.isAc && (
            <Badge tone="blue">
              <Snowflake className="size-3" aria-hidden /> AC
            </Badge>
          )}
          {ride.vehicle.hasCarrier && (
            <Badge>
              <Luggage className="size-3" aria-hidden /> Carrier
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-paper/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={ride.driver.name} src={driverAvatarSrc(ride.driver.id, ride.driver.avatarKey)} size={40} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-sm font-semibold">
              {ride.driver.name}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Rating value={ride.driver.ratingAvg} count={ride.driver.ratingCount} className="text-xs" />
              {ride.driver.verified && <VerifiedBadge compact className="py-0" />}
            </div>
          </div>
        </div>
        <div className="hidden text-right text-xs text-muted sm:block">
          {ride.vehicle.model}
          <br />
          <span className="font-mono">{maskVehicleNumber(ride.vehicle.registrationNumber)}</span>
        </div>
        <Link
          href={href}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-forest-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-forest-800 after:absolute after:inset-0"
          aria-label={`View ride with ${ride.driver.name} at ${formatTime(ride.boarding.at)}`}
        >
          View Ride <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export function RideCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-hidden>
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-paper-2" />
          <div className="h-6 w-48 animate-pulse rounded bg-paper-2" />
        </div>
        <div className="h-7 w-16 animate-pulse rounded bg-paper-2" />
      </div>
      <div className="mt-5 h-10 animate-pulse rounded-xl bg-paper-2" />
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-28 animate-pulse rounded-full bg-paper-2" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-paper-2" />
      </div>
      <div className="mt-5 flex items-center gap-3">
        <div className="size-10 animate-pulse rounded-full bg-paper-2" />
        <div className="h-4 w-32 animate-pulse rounded bg-paper-2" />
      </div>
    </div>
  );
}
