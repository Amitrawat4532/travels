import { formatTime } from "@/lib/format";
import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TimelineStop = {
  id: string;
  name: string;
  point: string;
  at: Date;
  fareFromOriginPaise?: number;
};

export function StopTimeline({
  stops,
  boardingId,
  dropId,
  showFares,
  annotate,
}: {
  stops: TimelineStop[];
  boardingId?: string;
  dropId?: string;
  showFares?: boolean;
  /** Extra content per stop, e.g. "2 boarding · 1 getting down" for drivers. */
  annotate?: (stop: TimelineStop) => React.ReactNode;
}) {
  const bIdx = boardingId ? stops.findIndex((s) => s.id === boardingId) : -1;
  const dIdx = dropId ? stops.findIndex((s) => s.id === dropId) : -1;
  return (
    <ol className="relative">
      {stops.map((s, i) => {
        const inSegment = bIdx >= 0 && dIdx >= 0 ? i >= bIdx && i <= dIdx : true;
        const isEnd = i === bIdx || i === dIdx;
        const last = i === stops.length - 1;
        return (
          <li key={s.id} className="relative grid grid-cols-[4.5rem_1.25rem_1fr] gap-x-3 pb-5 last:pb-0">
            <time className={cn("pt-0.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums", inSegment ? "text-ink" : "text-muted")}>
              {formatTime(s.at)}
            </time>
            <div className="relative flex justify-center">
              {!last && (
                <span
                  className={cn(
                    "absolute top-4 -bottom-5 w-0.5",
                    inSegment && i < dIdx ? "bg-forest-500" : bIdx >= 0 && dIdx >= 0 ? "bg-line" : "bg-forest-200",
                  )}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  "relative z-10 mt-1 size-3.5 rounded-full border-[3px]",
                  isEnd ? "border-forest-700 bg-white ring-4 ring-forest-100" : inSegment ? "border-forest-500 bg-white" : "border-line bg-white",
                )}
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <p className={cn("text-[15px] font-semibold", inSegment ? "text-ink" : "text-muted")}>
                {s.name}
                {i === bIdx && <span className="ml-2 rounded-full bg-forest-700 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">Board</span>}
                {i === dIdx && <span className="ml-2 rounded-full bg-marigold-400 px-2 py-0.5 text-[10px] font-bold tracking-wide text-forest-900 uppercase">Drop</span>}
              </p>
              <p className="text-sm text-muted">{s.point}</p>
              {showFares && s.fareFromOriginPaise !== undefined && i > 0 && (
                <p className="text-xs text-muted">From start: {formatPaise(s.fareFromOriginPaise)}</p>
              )}
              {annotate?.(s)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
