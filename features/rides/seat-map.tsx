"use client";

import { cn } from "@/lib/utils";

export type SeatState = "AVAILABLE" | "BOOKED" | "BLOCKED";
export type SeatInfo = { seatNumber: number; status: SeatState };

/** Seat 1 sits beside the driver; the rest are arranged in rows of three. */
export function seatRows(seats: SeatInfo[]): SeatInfo[][] {
  const sorted = [...seats].sort((a, b) => a.seatNumber - b.seatNumber);
  const rows: SeatInfo[][] = [sorted.slice(0, 1)];
  for (let i = 1; i < sorted.length; i += 3) rows.push(sorted.slice(i, i + 3));
  return rows;
}

export function SeatMap({
  seats,
  selected = [],
  onToggle,
  renderLabel,
  ownSeats = [],
  className,
}: {
  seats: SeatInfo[];
  selected?: number[];
  onToggle?: (seat: number) => void;
  renderLabel?: (seat: SeatInfo) => string;
  /** Seats that belong to the current viewer (shown highlighted, not clickable). */
  ownSeats?: number[];
  className?: string;
}) {
  const rows = seatRows(seats);
  return (
    <div className={cn("mx-auto w-full max-w-[260px] rounded-[2rem] border-2 border-line bg-paper px-4 pt-4 pb-5", className)}>
      <div className="mb-3 flex items-center justify-between px-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
        <span>Front</span>
        <span className="flex items-center gap-1">
          Driver
          <svg viewBox="0 0 24 24" className="size-6 text-ink-2" aria-hidden>
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            <path d="M3.5 11h6M14.5 11h6M12 14.5V21" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
      </div>
      <div className="space-y-2.5" role="group" aria-label="Seat map">
        {rows.map((row, ri) => (
          <div key={ri} className={cn("grid grid-cols-3 gap-2.5", ri === 0 && "mb-4")}>
            {ri === 0 && <span className="col-span-2" aria-hidden />}
            {row.map((seat) => {
              const isOwn = ownSeats.includes(seat.seatNumber);
              const isSel = selected.includes(seat.seatNumber);
              const disabled = seat.status !== "AVAILABLE" || !onToggle;
              return (
                <button
                  key={seat.seatNumber}
                  type="button"
                  disabled={disabled && !isSel}
                  onClick={() => onToggle?.(seat.seatNumber)}
                  aria-pressed={onToggle ? isSel : undefined}
                  aria-label={`Seat ${seat.seatNumber}, ${isOwn ? "your seat" : isSel ? "selected" : seat.status === "AVAILABLE" ? "available" : "booked"}`}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-xl border-2 text-[15px] font-bold transition-all",
                    "before:absolute before:inset-x-2 before:-bottom-[3px] before:h-1.5 before:rounded-b-md before:bg-current before:opacity-25",
                    isOwn
                      ? "border-marigold-500 bg-marigold-100 text-marigold-700"
                      : isSel
                        ? "scale-[1.04] border-forest-700 bg-forest-700 text-white shadow-md"
                        : seat.status === "AVAILABLE"
                          ? onToggle
                            ? "border-forest-300 bg-white text-forest-800 hover:border-forest-600 hover:bg-forest-50"
                            : "border-forest-300 bg-white text-forest-800"
                          : "cursor-not-allowed border-line bg-paper-2 text-muted/60 line-through",
                  )}
                >
                  {renderLabel ? renderLabel(seat) : seat.seatNumber}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeatLegend({ showOwn }: { showOwn?: boolean }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
      <li className="flex items-center gap-1.5">
        <span className="size-3.5 rounded border-2 border-forest-300 bg-white" /> Available
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3.5 rounded border-2 border-forest-700 bg-forest-700" /> Selected
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3.5 rounded border-2 border-line bg-paper-2" /> Booked
      </li>
      {showOwn && (
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border-2 border-marigold-500 bg-marigold-100" /> Yours
        </li>
      )}
    </ul>
  );
}
