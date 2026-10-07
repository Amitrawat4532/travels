"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_SEATS_PER_BOOKING, PLATFORM_FEE_PER_SEAT_PAISE } from "@/lib/constants";
import { formatPaise } from "@/lib/format";
import { SeatLegend, SeatMap, type SeatInfo } from "./seat-map";

export function SeatPicker({
  tripId,
  seats,
  farePaise,
  initialCount,
  fromSlug,
  toSlug,
  bookable,
  closedReason,
  loginHref,
}: {
  tripId: string;
  seats: SeatInfo[];
  farePaise: number;
  initialCount: number;
  fromSlug: string;
  toSlug: string;
  bookable: boolean;
  closedReason?: string;
  /** When set, the viewer must log in (as a passenger) first. */
  loginHref?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const available = seats.filter((s) => s.status === "AVAILABLE").map((s) => s.seatNumber);
  const [selected, setSelected] = useState<number[]>(() => (bookable ? available.slice(0, Math.min(initialCount, available.length)) : []));
  const [hint, setHint] = useState<string | null>(null);

  function toggle(n: number) {
    setHint(null);
    setSelected((prev) => {
      if (prev.includes(n)) return prev.filter((s) => s !== n);
      if (prev.length >= MAX_SEATS_PER_BOOKING) {
        setHint(`You can book up to ${MAX_SEATS_PER_BOOKING} seats in one booking.`);
        return prev;
      }
      return [...prev, n].sort((a, b) => a - b);
    });
  }

  const count = selected.length;
  const fare = farePaise * count;
  const fee = PLATFORM_FEE_PER_SEAT_PAISE * count;

  function proceed() {
    if (count === 0) return setHint("Select at least one seat.");
    const q = new URLSearchParams({ seats: selected.join(","), from: fromSlug, to: toSlug });
    const target = `/book/${tripId}?${q}`;
    start(() => router.push(loginHref ? `${loginHref}${encodeURIComponent(target)}` : target));
  }

  return (
    <div>
      <SeatMap seats={seats} selected={selected} onToggle={bookable ? toggle : undefined} />
      <div className="mt-3">
        <SeatLegend />
      </div>

      {bookable ? (
        <div className="mt-5 space-y-3">
          <div className="rounded-xl bg-paper p-3.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">
                {count} {count === 1 ? "seat" : "seats"} × {formatPaise(farePaise)}
              </span>
              <span className="font-semibold tabular-nums">{formatPaise(fare)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted">Platform fee</span>
              <span className="tabular-nums">{formatPaise(fee)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatPaise(fare + fee)}</span>
            </div>
          </div>
          {hint && (
            <p className="flex items-center gap-1.5 text-sm text-marigold-700" role="status">
              <Info className="size-4" aria-hidden /> {hint}
            </p>
          )}
          <Button size="lg" className="w-full" onClick={proceed} loading={pending} disabled={count === 0}>
            {selected.length ? `Continue Booking · Seat ${selected.join(", ")}` : "Select seats"}
            {!pending && <ArrowRight className="size-4" aria-hidden />}
          </Button>
          {loginHref && <p className="text-center text-xs text-muted">You&apos;ll be asked to log in or sign up first.</p>}
        </div>
      ) : (
        <p className="mt-5 rounded-xl bg-paper-2 p-3 text-center text-sm font-medium text-ink-2">{closedReason}</p>
      )}
    </div>
  );
}
