"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Calendar, MapPin, Minus, Navigation, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_SEATS_PER_BOOKING } from "@/lib/constants";
import { toIstDateString } from "@/lib/format";
import { cn } from "@/lib/utils";

export type LocationOption = { name: string; slug: string };

type Props = {
  locations: LocationOption[];
  defaults?: { from?: string; to?: string; date?: string; passengers?: number };
  variant?: "hero" | "compact";
};

export function SearchForm({ locations, defaults, variant = "hero" }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [from, setFrom] = useState(defaults?.from ?? "dehradun");
  const [to, setTo] = useState(defaults?.to ?? "rudraprayag");
  const [date, setDate] = useState(defaults?.date ?? "");
  const [minDate, setMinDate] = useState<string>();
  const [passengers, setPassengers] = useState(defaults?.passengers ?? 1);
  const [error, setError] = useState<string | null>(null);

  // Dates depend on the visitor's clock, so set them after hydration.
  useEffect(() => {
    const now = new Date();
    setMinDate(toIstDateString(now));
    if (!defaults?.date) setDate(toIstDateString(new Date(now.getTime() + 86_400_000)));
  }, [defaults?.date]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return setError("Choose where you are travelling from and to.");
    if (from === to) return setError("From and To cannot be the same place.");
    setError(null);
    const q = new URLSearchParams({ from, to, passengers: String(passengers) });
    if (date) q.set("date", date);
    start(() => router.push(`/search?${q.toString()}`));
  }

  const compact = variant === "compact";

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Search rides"
      className={cn(
        "rounded-3xl bg-white",
        compact ? "border border-line p-3 shadow-card sm:p-4" : "p-3 shadow-lift ring-1 ring-forest-900/5 sm:p-4",
      )}
    >
      <div className={cn("grid gap-2", compact ? "md:grid-cols-[1fr_auto_1fr_0.9fr_0.6fr_auto]" : "lg:grid-cols-[1fr_auto_1fr_0.9fr_0.6fr_auto]")}>
        <LocationSelect id="from" label="From" icon={<Navigation className="size-4" />} value={from} onChange={setFrom} locations={locations} />
        <div className={cn("relative z-10 -my-4 flex justify-center", compact ? "md:my-0 md:items-center" : "lg:my-0 lg:items-center")}>
          <button
            type="button"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            className="flex size-9 items-center justify-center rounded-full border border-line bg-white text-forest-700 shadow-sm transition hover:rotate-180 hover:border-forest-300"
            aria-label="Swap from and to"
          >
            <ArrowUpDown className="size-4" />
          </button>
        </div>
        <LocationSelect id="to" label="To" icon={<MapPin className="size-4" />} value={to} onChange={setTo} locations={locations} />
        <label htmlFor="date" className="group flex flex-col rounded-2xl border border-line px-4 py-2.5 transition-colors focus-within:border-forest-400 focus-within:ring-4 focus-within:ring-forest-100">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
            <Calendar className="size-3.5" aria-hidden /> Date
          </span>
          <input
            id="date"
            type="date"
            value={date}
            min={minDate}
            onChange={(e) => setDate(e.target.value)}
            className="mt-0.5 w-full bg-transparent text-[15px] font-semibold text-ink outline-none"
          />
        </label>
        <div className="flex flex-col rounded-2xl border border-line px-4 py-2.5">
          <span id="pax-label" className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
            <Users className="size-3.5" aria-hidden /> Passengers
          </span>
          <div className="mt-0.5 flex items-center justify-between gap-2" role="group" aria-labelledby="pax-label">
            <button
              type="button"
              onClick={() => setPassengers((p) => Math.max(1, p - 1))}
              disabled={passengers <= 1}
              className="flex size-7 items-center justify-center rounded-full border border-line disabled:opacity-40"
              aria-label="Fewer passengers"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="text-[15px] font-semibold tabular-nums" aria-live="polite">
              {passengers}
            </span>
            <button
              type="button"
              onClick={() => setPassengers((p) => Math.min(MAX_SEATS_PER_BOOKING, p + 1))}
              disabled={passengers >= MAX_SEATS_PER_BOOKING}
              className="flex size-7 items-center justify-center rounded-full border border-line disabled:opacity-40"
              aria-label="More passengers"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
        <Button type="submit" size="lg" loading={pending} className={cn("h-auto min-h-14 rounded-2xl px-6 text-base", compact ? "md:min-w-32" : "lg:min-w-40")}>
          {!pending && <Search className="size-5" aria-hidden />}
          Search Rides
        </Button>
      </div>
      {error && (
        <p className="mt-2 px-2 text-sm text-danger-500" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function LocationSelect({
  id,
  label,
  icon,
  value,
  onChange,
  locations,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  locations: LocationOption[];
}) {
  return (
    <label htmlFor={id} className="flex flex-col rounded-2xl border border-line px-4 py-2.5 transition-colors focus-within:border-forest-400 focus-within:ring-4 focus-within:ring-forest-100">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
        <span className="text-forest-500" aria-hidden>
          {icon}
        </span>
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full cursor-pointer appearance-none bg-transparent text-[17px] font-bold text-ink outline-none"
      >
        <option value="" disabled>
          Select town
        </option>
        {locations.map((l) => (
          <option key={l.slug} value={l.slug}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SearchFormSkeleton() {
  return <div className="h-[268px] animate-pulse rounded-3xl bg-white/80 shadow-lift lg:h-[84px]" aria-hidden />;
}
