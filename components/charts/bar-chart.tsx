"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type BarDatum = { label: string; value: number; display?: string };

/**
 * Single-series vertical bar chart. One hue (forest), 4px rounded data-ends,
 * 2px gaps, recessive baseline, hover/focus tooltip, and an sr-only table.
 */
export function BarChart({
  data,
  height = 180,
  format = (v) => String(v),
  caption,
  className,
}: {
  data: BarDatum[];
  height?: number;
  format?: (v: number) => string;
  caption: string;
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);

  return (
    <figure className={cn("w-full", className)}>
      <div className="relative" style={{ height }} onMouseLeave={() => setActive(null)}>
        {/* recessive gridlines */}
        {[0.5, 1].map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${t * 100}%` }} aria-hidden />
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px] border-b border-ink/15">
          {data.map((d, i) => {
            const h = (d.value / max) * 100;
            const on = active === i;
            return (
              <button
                key={d.label}
                type="button"
                className="group relative flex h-full flex-1 items-end justify-center focus:outline-none"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${d.label}: ${d.display ?? format(d.value)}`}
              >
                <span
                  className={cn(
                    "w-full max-w-12 rounded-t-[4px] transition-colors",
                    on ? "bg-forest-700" : "bg-forest-400",
                    d.value > 0 && "min-h-[2px]",
                  )}
                  style={{ height: `${h}%` }}
                />
                {(on || (active === null && i === peak && d.value > 0)) && (
                  <span
                    className={cn(
                      "pointer-events-none absolute z-10 -translate-y-full rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap tabular-nums",
                      on ? "bg-ink text-white shadow-lift" : "text-ink-2",
                    )}
                    style={{ bottom: `calc(${h}% + 4px)` }}
                  >
                    {on && <span className="mr-1 font-normal opacity-75">{d.label}</span>}
                    {d.display ?? format(d.value)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex h-4 gap-[2px]" aria-hidden>
        {data.map((d, i) => {
          const step = data.length > 12 ? Math.ceil(data.length / 6) : 1;
          const show = i % step === 0 || i === data.length - 1;
          return (
            <span key={d.label} className="relative flex-1">
              {show && (
                <span className="absolute left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap text-muted">{d.label}</span>
              )}
            </span>
          );
        })}
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{d.display ?? format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal ranked bars (e.g. popular routes). Labels in ink, value at bar end. */
export function RankBars({ data, format = (v) => String(v) }: { data: BarDatum[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink">{d.label}</span>
            <span className="shrink-0 font-semibold text-ink-2 tabular-nums">{d.display ?? format(d.value)}</span>
          </div>
          <div className="h-2.5 rounded-r-[4px] bg-paper-2">
            <div className="h-full rounded-r-[4px] bg-forest-500" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
