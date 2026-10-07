import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { formatPaise, formatShortDay, formatTime } from "@/lib/format";
import type { BookingListItem } from "@/server/queries/bookings";

export function BookingRow({ booking }: { booking: BookingListItem }) {
  const d = formatShortDay(booking.boardingStop.scheduledAt);
  const canRate = booking.status === "COMPLETED" && !booking.review && booking.boardingStatus !== "NO_SHOW";
  return (
    <Link
      href={`/passenger/bookings/${booking.id}`}
      className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-card transition-shadow hover:shadow-lift"
    >
      <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-forest-50 py-2 text-forest-800">
        <span className="text-xl leading-none font-extrabold">{d.day}</span>
        <span className="mt-0.5 text-[11px] font-bold tracking-wider">{d.month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">
          {booking.boardingStop.location.name} → {booking.dropStop.location.name}
        </p>
        <p className="mt-0.5 truncate text-sm text-muted">
          {formatTime(booking.boardingStop.scheduledAt)} · {booking.boardingStop.pointName}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
          <span className="text-xs text-muted">
            Seat {booking.seatNumbers.join(", ")} · {booking.code}
          </span>
          {canRate && (
            <span className="inline-flex items-center gap-1 rounded-full bg-marigold-50 px-2 py-0.5 text-xs font-semibold text-marigold-700">
              <Star className="size-3" aria-hidden /> Rate driver
            </span>
          )}
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        <div className="text-right">
          <p className="font-bold tabular-nums">{formatPaise(booking.totalPaise)}</p>
          <p className="text-xs text-muted">{booking.trip.driver.user.name}</p>
        </div>
        <Avatar name={booking.trip.driver.user.name} size={36} />
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

export function BookingList({ bookings }: { bookings: BookingListItem[] }) {
  return (
    <ul className="space-y-3">
      {bookings.map((b) => (
        <li key={b.id}>
          <BookingRow booking={b} />
        </li>
      ))}
    </ul>
  );
}
