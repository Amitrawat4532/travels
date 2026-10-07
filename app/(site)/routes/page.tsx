import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getPopularRoutes } from "@/server/queries/rides";
import { Skeleton } from "@/components/ui/misc";
import { formatDuration, formatPaise } from "@/lib/format";

export const metadata: Metadata = {
  title: "Shared taxi routes in Uttarakhand",
  description: "Dehradun ↔ Rudraprayag, Dehradun ↔ Srinagar and more. See fares, travel time and upcoming shared taxi rides.",
  alternates: { canonical: "/routes" },
};

export default function RoutesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Routes</h1>
      <p className="mt-2 text-lg text-muted">Shuru mein Garhwal ke sabse busy raste. Aur routes jaldi aa rahe hain.</p>
      <Suspense fallback={<Skeleton className="mt-8 h-64" />}>
        <RouteList />
      </Suspense>
    </div>
  );
}

async function RouteList() {
  const routes = await getPopularRoutes();
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2">
      {routes.map((r) => (
        <li key={r.id}>
          <Link href={`/routes/${r.slug}`} className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-card hover:shadow-lift">
            <h2 className="text-xl font-bold">
              {r.origin.name} → {r.destination.name}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {r.distanceKm} km · about {formatDuration(r.durationMinutes)}
            </p>
            {r.stops.length > 0 && <p className="mt-1 text-sm text-muted">Via {r.stops.map((s) => s.location.name).join(" · ")}</p>}
            <p className="mt-auto flex items-center justify-between pt-5 text-sm">
              <span>
                from <strong className="text-lg">{formatPaise(r.suggestedFarePaise)}</strong> / seat
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-forest-700">
                Rides <ArrowRight className="size-4" aria-hidden />
              </span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
