"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Clock, Info, MapPin, Navigation } from "lucide-react";
import { formatDuration, formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

export type RouteMapStop = {
  name: string;
  lat: number;
  lng: number;
  km: number;
  minutes: number;
  farePaise: number;
};

const W = 800;
const H = 340;
const PAD = 60;
const KM_PER_DEG_LAT = 111.32;

/**
 * Schematic route: town markers are placed from their stored latitude /
 * longitude (equirectangular projection, north up) and joined in stop order
 * with straight lines. It is NOT the road geometry — the UI says so.
 */
export function RouteMap({ stops, totalKm, totalMinutes }: { stops: RouteMapStop[]; totalKm: number; totalMinutes: number }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(stops.length - 1);

  const geo = useMemo(() => {
    const lats = stops.map((s) => s.lat);
    const lngs = stops.map((s) => s.lng);
    const meanLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const k = Math.cos((meanLat * Math.PI) / 180);
    const minX = Math.min(...lngs) * k;
    const maxX = Math.max(...lngs) * k;
    const minY = Math.min(...lats);
    const maxY = Math.max(...lats);
    const scale = Math.min((W - PAD * 2) / (maxX - minX || 1), (H - PAD * 2) / (maxY - minY || 1));
    const offX = (W - (maxX - minX) * scale) / 2;
    const offY = (H - (maxY - minY) * scale) / 2;
    const pts = stops.map((s) => ({ x: offX + (s.lng * k - minX) * scale, y: offY + (maxY - s.lat) * scale }));
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    // 20 km scale bar in screen units.
    const pxPerKm = scale / KM_PER_DEG_LAT;
    return { pts, d, bar: 20 * pxPerKm };
  }, [stops]);

  const s = stops[active]!;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
      <figure className="relative overflow-hidden rounded-[28px] bg-forest-900 p-3 shadow-lift sm:p-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby="route-map-title route-map-desc">
          <title id="route-map-title">Schematic route map from Dehradun to Rudraprayag</title>
          <desc id="route-map-desc">
            Stops in order: {stops.map((x) => x.name).join(", ")}. Total about {totalKm} km and {formatDuration(totalMinutes)} by road.
          </desc>
          <defs>
            <pattern id="rm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="#ffffff" strokeOpacity="0.05" />
            </pattern>
            <filter id="rm-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <rect width={W} height={H} fill="url(#rm-grid)" />
          {/* Route line */}
          <path d={geo.d} fill="none" stroke="#eab04a" strokeOpacity="0.25" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" filter="url(#rm-glow)" />
          <motion.path
            d={geo.d}
            fill="none"
            stroke="#eab04a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1 0"
            initial={reduce ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
          />
          {/* Moving vehicle */}
          {!reduce && (
            <g>
              <circle r="9" fill="#eab04a" opacity="0.25">
                <animateMotion dur="9s" repeatCount="indefinite" path={geo.d} />
              </circle>
              <circle r="5" fill="#fff6dc" stroke="#eab04a" strokeWidth="2">
                <animateMotion dur="9s" repeatCount="indefinite" path={geo.d} />
              </circle>
            </g>
          )}
          {/* Stops */}
          {geo.pts.map((p, i) => {
            const st = stops[i]!;
            const on = i === active;
            const end = i === 0 || i === stops.length - 1;
            const labelBelow = i % 2 === 1;
            return (
              <g key={st.name} className="cursor-pointer" onClick={() => setActive(i)}>
                <circle cx={p.x} cy={p.y} r={on ? 14 : 0} fill="#eab04a" opacity="0.2" className="transition-all duration-300" />
                <circle cx={p.x} cy={p.y} r={end ? 7 : 5.5} fill={on ? "#eab04a" : "#faf8f3"} stroke="#0f291d" strokeWidth="2.5" />
                <text
                  x={p.x}
                  y={labelBelow ? p.y + 32 : p.y - 20}
                  textAnchor="middle"
                  className="font-sans"
                  fontSize={end ? 21 : 17}
                  fontWeight={end || on ? 700 : 500}
                  fill={on ? "#eab04a" : "#e8efe9"}
                >
                  {st.name}
                </text>
              </g>
            );
          })}
          {/* North arrow + scale bar (straight-line distance) */}
          <g transform={`translate(${W - 34} 36)`} fill="#e8efe9" fillOpacity="0.7">
            <path d="M0 -14 6 4 0 0 -6 4Z" />
            <text y="20" textAnchor="middle" fontSize="11" fontWeight={700}>
              N
            </text>
          </g>
          <g transform={`translate(24 ${H - 22})`} stroke="#e8efe9" strokeOpacity="0.7" fill="#e8efe9" fillOpacity="0.7">
            <path d={`M0 0H${geo.bar.toFixed(1)}M0 -4V4M${geo.bar.toFixed(1)} -4V4`} strokeWidth="1.5" />
            <text x={geo.bar + 8} y="4" fontSize="13" stroke="none">
              ≈ 20 km straight-line
            </text>
          </g>
        </svg>
        <figcaption className="mt-2 flex items-start gap-1.5 px-1 text-xs leading-snug text-forest-200">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          Schematic. Town positions come from their stored coordinates; straight lines show the stop order, not the actual road.
          Road distance and time are from our route data.
        </figcaption>
      </figure>

      <div>
        <p className="text-xs font-bold tracking-[0.16em] text-forest-600 uppercase">Route</p>
        <h3 className="mt-2 text-3xl font-extrabold tracking-tight">
          {stops[0]!.name} <span className="font-display font-normal text-forest-500 italic">to</span> {stops[stops.length - 1]!.name}
        </h3>
        <p className="mt-2 text-muted">
          ~{totalKm} km by road · about {formatDuration(totalMinutes)}
        </p>
        <ol className="mt-5 space-y-1.5" aria-label="Stops">
          {stops.map((st, i) => (
            <li key={st.name}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-300",
                  i === active ? "border-forest-700 bg-white shadow-card" : "border-transparent hover:border-line hover:bg-white/60",
                )}
              >
                <span className="flex items-center gap-3">
                  <span className={cn("flex size-7 items-center justify-center rounded-full text-xs font-bold", i === active ? "bg-forest-800 text-white" : "bg-paper-2 text-ink-2")}>
                    {i === 0 ? <Navigation className="size-3.5" aria-hidden /> : i === stops.length - 1 ? <MapPin className="size-3.5" aria-hidden /> : i}
                  </span>
                  <span className="font-semibold">{st.name}</span>
                </span>
                <span className="text-right text-xs text-muted">
                  {i === 0 ? "Start" : `${st.km} km · ${formatDuration(st.minutes)}`}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <motion.div
          key={s.name}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-4 flex items-center justify-between rounded-2xl bg-forest-50 px-4 py-3 text-sm text-forest-900"
          aria-live="polite"
        >
          <span className="flex items-center gap-2">
            <Clock className="size-4" aria-hidden />
            {active === 0 ? "Boarding point" : `${stops[0]!.name} → ${s.name}: about ${formatDuration(s.minutes)}`}
          </span>
          {active > 0 && <strong>≈ {formatPaise(s.farePaise)} suggested</strong>}
        </motion.div>
      </div>
    </div>
  );
}
