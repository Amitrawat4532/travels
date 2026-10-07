"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Camera, Move3d, RotateCw } from "lucide-react";
import type { VehicleType } from "@prisma/client";
import { VEHICLE_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Shows the best available picture of a vehicle:
 *  1. Real photos uploaded by the driver (always preferred — that's the actual car).
 *  2. 360° studio renders of the make/model from imagin.studio, when
 *     NEXT_PUBLIC_IMAGIN_CUSTOMER_KEY is configured (licensed key required).
 *  3. A built-in illustration of the vehicle type in the vehicle's colour,
 *     with a light 3D tilt. Works offline and for any model.
 */

const COLOR_HEX: Record<string, string> = {
  white: "#f4f4f1",
  "diamond white": "#f7f7f4",
  "pearl white": "#f3f2ee",
  silver: "#c7cacc",
  "mist silver": "#cfd3d4",
  grey: "#8a9094",
  gray: "#8a9094",
  black: "#2a2d30",
  red: "#b93a32",
  maroon: "#7a2630",
  blue: "#2f5d8c",
  "dark blue": "#22395c",
  green: "#2f704a",
  yellow: "#e2b13c",
  orange: "#d9772a",
  brown: "#7b5a3c",
  beige: "#d8c8a8",
};

export function colorHex(color?: string | null): string {
  if (!color) return "#f4f4f1";
  const key = color.trim().toLowerCase();
  return COLOR_HEX[key] ?? COLOR_HEX[key.split(" ").pop() ?? ""] ?? "#f4f4f1";
}

const STUDIO_KEY = process.env.NEXT_PUBLIC_IMAGIN_CUSTOMER_KEY;
const STUDIO_ANGLES = ["01", "05", "09", "13", "17", "21", "23", "27", "29"];

function studioUrl(model: string, color: string | null | undefined, angle: string) {
  const [make, ...rest] = model.trim().toLowerCase().split(/\s+/);
  const q = new URLSearchParams({
    customer: STUDIO_KEY ?? "",
    make: make ?? "",
    modelFamily: rest[0] ?? "",
    angle,
    zoomType: "fullscreen",
    paintDescription: (color ?? "white").toLowerCase(),
    width: "800",
  });
  return `https://cdn.imagin.studio/getImage?${q}`;
}

type Props = {
  type: VehicleType;
  model?: string;
  color?: string | null;
  hasCarrier?: boolean;
  photos?: string[];
  className?: string;
  /** Show the label strip and interaction hints. */
  showCaption?: boolean;
};

export function VehicleVisual({ type, model, color, hasCarrier, photos = [], className, showCaption = true }: Props) {
  const [studioFailed, setStudioFailed] = useState(false);
  const useStudio = Boolean(STUDIO_KEY && model && model.trim().split(/\s+/).length >= 2 && !studioFailed);

  if (photos.length > 0) return <PhotoGallery photos={photos} label={model} className={className} />;

  return (
    <figure className={cn("overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-white to-forest-50/70", className)}>
      {useStudio ? (
        <StudioViewer model={model!} color={color} onFail={() => setStudioFailed(true)} />
      ) : (
        <IllustratedVehicle type={type} color={color} hasCarrier={hasCarrier} />
      )}
      {showCaption && (
        <figcaption className="flex items-center justify-between gap-2 border-t border-line bg-white/70 px-3 py-2 text-xs text-muted">
          <span className="truncate font-medium text-ink-2">
            {model || VEHICLE_TYPE_LABELS[type]}
            {color ? ` · ${color}` : ""}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1">
            {useStudio ? (
              <>
                <RotateCw className="size-3.5" aria-hidden /> Drag to rotate · studio image
              </>
            ) : (
              <>
                <Move3d className="size-3.5" aria-hidden /> Preview · add real photos
              </>
            )}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

function PhotoGallery({ photos, label, className }: { photos: string[]; label?: string; className?: string }) {
  const [active, setActive] = useState(0);
  return (
    <figure className={cn("overflow-hidden rounded-2xl border border-line bg-white", className)}>
      <div className="relative aspect-[16/9] bg-paper-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- served by the authenticated file route */}
        <img src={photos[active]} alt={label ? `${label} — real photo` : "Vehicle photo"} className="size-full object-cover" />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-forest-800/85 px-2 py-0.5 text-[11px] font-semibold text-white">
          <Camera className="size-3" aria-hidden /> Real photo
        </span>
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto p-2">
          {photos.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Photo ${i + 1}`}
              aria-pressed={i === active}
              className={cn("size-14 shrink-0 overflow-hidden rounded-lg ring-2", i === active ? "ring-forest-600" : "ring-transparent")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}

function StudioViewer({ model, color, onFail }: { model: string; color?: string | null; onFail: () => void }) {
  const [idx, setIdx] = useState(0);
  const drag = useRef<{ x: number; idx: number } | null>(null);

  // Preload the angles so rotation is smooth.
  useEffect(() => {
    STUDIO_ANGLES.forEach((a) => {
      const img = new Image();
      img.src = studioUrl(model, color, a);
    });
  }, [model, color]);

  function onDown(e: PointerEvent<HTMLDivElement>) {
    drag.current = { x: e.clientX, idx };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const steps = Math.round((e.clientX - drag.current.x) / 40);
    const n = STUDIO_ANGLES.length;
    setIdx((((drag.current.idx - steps) % n) + n) % n);
  }

  return (
    <div
      className="relative aspect-[16/9] cursor-grab touch-pan-y select-none active:cursor-grabbing"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={() => (drag.current = null)}
      role="img"
      aria-label={`${model} studio image, drag to rotate`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external CDN, rotates between angles */}
      <img
        src={studioUrl(model, color, STUDIO_ANGLES[idx]!)}
        alt=""
        draggable={false}
        onError={onFail}
        className="size-full object-contain p-2"
      />
    </div>
  );
}

/* ───────── Illustrations ───────── */

type Shape = { body: string; windows: string[]; wheels: [number, number]; roof: [number, number, number]; width: number };

const SHAPES: Record<"hatch" | "sedan" | "suv" | "muv" | "van" | "bus", Shape> = {
  hatch: {
    body: "M24 104V80q0-10 12-12l40-6 34-28q6-5 14-5h86q10 0 16 8l22 30 26 4q12 2 12 14v19Z",
    windows: ["M86 61l30-24q4-3 9-3h38v27Z", "M170 34h28q7 0 11 6l16 21h-55Z"],
    wheels: [78, 232],
    roof: [110, 30, 220],
    width: 300,
  },
  sedan: {
    body: "M16 104V84q0-10 12-11l44-6 38-27q6-5 14-5h72q10 0 17 6l34 26 44 6q12 2 12 14v17Z",
    windows: ["M84 66l34-24q4-3 9-3h40v27Z", "M174 39h24q8 0 14 5l26 22h-64Z"],
    wheels: [76, 252],
    roof: [120, 36, 230],
    width: 320,
  },
  suv: {
    body: "M18 106V70q0-10 10-12l42-4 18-30q4-6 12-6h176q10 0 12 8l8 34q12 2 12 14v22Z",
    windows: ["M78 54l17-28q3-4 8-4h54v32Z", "M164 22h52v32h-52Z", "M222 22h40q5 0 6 5l6 27h-52Z"],
    wheels: [76, 250],
    roof: [96, 14, 270],
    width: 312,
  },
  muv: {
    body: "M14 106V76q0-10 11-12l46-7 34-30q6-5 14-5h152q10 0 14 8l16 34q14 2 14 15v27Z",
    windows: ["M86 58l30-26q4-3 9-3h44v29Z", "M176 29h50v29h-50Z", "M232 29h30q6 0 9 6l10 23h-49Z"],
    wheels: [76, 254],
    roof: [118, 18, 276],
    width: 318,
  },
  van: {
    body: "M12 106V64q0-14 12-22l26-20q6-4 14-4h232q12 0 14 12l4 76Z",
    windows: ["M40 46l20-16q4-3 9-3h22v30H40Z", "M98 27h44v30H98Z", "M148 27h44v30h-44Z", "M198 27h44v30h-44Z", "M248 27h42l2 30h-44Z"],
    wheels: [70, 262],
    roof: [64, 12, 296],
    width: 316,
  },
  bus: {
    body: "M8 108V34q0-16 16-16h282q12 0 12 14v76Z",
    windows: ["M20 28h40v34H20Z", "M66 28h44v34H66Z", "M116 28h44v34h-44Z", "M166 28h44v34h-44Z", "M216 28h44v34h-44Z", "M266 28h42v34h-42Z"],
    wheels: [62, 266],
    roof: [40, 12, 300],
    width: 320,
  },
};

function shapeFor(type: VehicleType): keyof typeof SHAPES {
  switch (type) {
    case "HATCHBACK":
      return "hatch";
    case "SEDAN":
      return "sedan";
    case "SUV":
    case "BOLERO":
    case "SUMO":
      return "suv";
    case "ERTIGA":
    case "INNOVA":
      return "muv";
    case "TEMPO_TRAVELLER":
      return "van";
    case "MINI_BUS":
      return "bus";
  }
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, "0")}`;
}

export function IllustratedVehicle({
  type,
  color,
  hasCarrier,
  tilt = true,
}: {
  type: VehicleType;
  color?: string | null;
  hasCarrier?: boolean;
  tilt?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const s = SHAPES[shapeFor(type)];
  const fill = colorHex(color);
  const isLight = parseInt(fill.slice(1, 3), 16) > 180;
  const stroke = isLight ? "#9aa3a6" : shade(fill, -40);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!tilt || e.pointerType === "touch") return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setRot({ x: -py * 10, y: px * 22 });
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setRot({ x: 0, y: 0 })}
      className="relative flex aspect-[16/9] items-center justify-center [perspective:900px]"
      role="img"
      aria-label={`${VEHICLE_TYPE_LABELS[type]} illustration${color ? `, ${color}` : ""}`}
    >
      {/* mountains backdrop */}
      <svg viewBox="0 0 320 180" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <path d="M0 130 60 70l40 34 50-56 46 46 30-22 54 58H0Z" fill="#d9e9de" opacity=".7" />
        <rect y="138" width="320" height="42" fill="#e9e4d8" />
        <path d="M0 150h320" stroke="#fff" strokeWidth="2" strokeDasharray="14 10" opacity=".8" />
      </svg>
      <div
        className="relative w-[82%] transition-transform duration-200 ease-out [transform-style:preserve-3d]"
        style={{ transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}
      >
        <svg viewBox={`0 0 ${s.width + 10} 140`} className="w-full drop-shadow-[0_14px_10px_rgba(15,41,29,0.22)]" aria-hidden>
          <defs>
            <linearGradient id={`body-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={shade(fill, 18)} />
              <stop offset="0.55" stopColor={fill} />
              <stop offset="1" stopColor={shade(fill, -34)} />
            </linearGradient>
            <linearGradient id={`glass-${type}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3d5866" />
              <stop offset="1" stopColor="#1f2f37" />
            </linearGradient>
          </defs>
          <ellipse cx={(s.width + 10) / 2} cy="126" rx={s.width / 2} ry="7" fill="#0f291d" opacity=".18" />
          {hasCarrier && type !== "MINI_BUS" && (
            <g stroke="#3c4549" strokeWidth="3" strokeLinecap="round">
              <path d={`M${s.roof[0]} ${s.roof[1] - 6}H${s.roof[2]}`} />
              {[0, 0.33, 0.66, 1].map((t) => {
                const x = s.roof[0] + (s.roof[2] - s.roof[0]) * t;
                return <path key={t} d={`M${x} ${s.roof[1] - 6}v6`} />;
              })}
            </g>
          )}
          <path d={s.body} fill={`url(#body-${type})`} stroke={stroke} strokeWidth="1.5" />
          {s.windows.map((w) => (
            <path key={w} d={w} fill={`url(#glass-${type})`} opacity=".92" />
          ))}
          <path d={`M24 ${type === "MINI_BUS" ? 80 : 84}H${s.width - 6}`} stroke={shade(fill, -50)} strokeWidth="1.2" opacity=".5" />
          {/* lights */}
          <rect x={s.width - 2} y="78" width="8" height="8" rx="2" fill="#f6d77a" />
          <rect x="10" y="80" width="7" height="8" rx="2" fill="#c2412d" />
          {s.wheels.map((x) => (
            <g key={x}>
              <circle cx={x} cy="108" r="19" fill="#22282b" />
              <circle cx={x} cy="108" r="10" fill="#b9bfc2" />
              <circle cx={x} cy="108" r="3.5" fill="#5d666a" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
