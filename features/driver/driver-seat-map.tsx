"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SeatMap, type SeatInfo } from "@/features/rides/seat-map";
import { toast } from "@/components/ui/toast";
import { toggleSeatBlockAction } from "./actions";

/** Driver view: tap a free seat to block it for an offline passenger (or unblock). */
export function DriverSeatMap({
  tripId,
  seats,
  labels,
  editable,
}: {
  tripId: string;
  seats: SeatInfo[];
  labels: Record<number, string>;
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle(n: number) {
    if (!editable || pending) return;
    start(async () => {
      const fd = new FormData();
      fd.set("tripId", tripId);
      fd.set("seatNumber", String(n));
      const res = await toggleSeatBlockAction(fd);
      if (res.ok) {
        toast.success(res.message ?? "Seat updated");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  // Blocked seats are clickable too (to unblock), so present them as "available" to the map
  // and mark them via the label.
  const display: SeatInfo[] = seats.map((s) => (s.status === "BLOCKED" ? { ...s, status: "AVAILABLE" } : s));
  const blocked = seats.filter((s) => s.status === "BLOCKED").map((s) => s.seatNumber);

  return (
    <div aria-busy={pending}>
      <SeatMap
        seats={display}
        selected={blocked}
        onToggle={editable ? toggle : undefined}
        renderLabel={(s) => labels[s.seatNumber] ?? String(s.seatNumber)}
      />
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border-2 border-forest-300 bg-white" /> Free
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border-2 border-line bg-paper-2" /> Booked (initials)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded border-2 border-forest-700 bg-forest-700" /> Blocked by you
        </li>
      </ul>
      {editable && <p className="mt-2 text-center text-xs text-muted">Tap a free seat to block it for someone travelling without the app.</p>}
    </div>
  );
}
