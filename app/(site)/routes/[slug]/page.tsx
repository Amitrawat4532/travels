import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connection } from "next/server";
import { CarFront } from "lucide-react";
import { getActiveLocations, getRouteBySlug, getUpcomingRidesForRoute } from "@/server/queries/rides";
import { RideCard, RideCardSkeleton } from "@/features/rides/ride-card";
import { SearchForm } from "@/features/search/search-form";
import { EmptyState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { formatDuration, formatPaise } from "@/lib/format";

function titleFromSlug(slug: string) {
  const [a, b] = slug.split("-to-");
  const cap = (s?: string) => (s ?? "").split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return { from: cap(a), to: cap(b) };
}

export async function generateMetadata(props: PageProps<"/routes/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const { from, to } = titleFromSlug(slug);
  return {
    title: `${from} to ${to} shared taxi — book a seat`,
    description: `Book a shared taxi seat from ${from} to ${to} with verified local drivers. See departure times, seats left, boarding points and fare.`,
    alternates: { canonical: `/routes/${slug}` },
    openGraph: { title: `${from} → ${to} shared taxi seats`, description: `Verified drivers, live seat availability. ${from} to ${to}.` },
  };
}

export default function RouteDetailPage(props: PageProps<"/routes/[slug]">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense
        fallback={
          <div className="space-y-4">
            <RideCardSkeleton />
            <RideCardSkeleton />
          </div>
        }
      >
        <Content params={props.params} />
      </Suspense>
    </div>
  );
}

async function Content({ params }: { params: PageProps<"/routes/[slug]">["params"] }) {
  const { slug } = await params;
  await connection();
  const route = await getRouteBySlug(slug);
  if (!route) notFound();
  const [rides, locations] = await Promise.all([getUpcomingRidesForRoute(route.originId, route.destinationId, 8), getActiveLocations()]);
  const now = new Date();

  return (
    <>
      <p className="text-xs font-bold tracking-[0.14em] text-forest-600 uppercase">Shared taxi route</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">
        {route.origin.name} → {route.destination.name}
      </h1>
      <p className="mt-3 text-lg text-muted">
        {route.distanceKm} km · about {formatDuration(route.durationMinutes)} · seats from {formatPaise(route.suggestedFarePaise)}
        {route.stops.length > 0 && <> · via {route.stops.map((s) => s.location.name).join(", ")}</>}
      </p>
      <div className="mt-6">
        <SearchForm locations={locations} variant="compact" defaults={{ from: route.origin.slug, to: route.destination.slug }} />
      </div>
      <h2 className="mt-10 mb-4 text-xl font-bold">Upcoming rides</h2>
      {rides.length === 0 ? (
        <EmptyState
          icon={<CarFront className="size-7" />}
          title="Is route ke liye abhi koi ride available nahi hai."
          description="Search a date and tap “Notify me” — we'll tell you as soon as a driver lists a ride."
          action={<LinkButton href={`/search?from=${route.origin.slug}&to=${route.destination.slug}`}>Search this route</LinkButton>}
        />
      ) : (
        <ul className="space-y-4">
          {rides.map((r) => (
            <li key={r.id}>
              <RideCard ride={r} now={now} query={{ from: route.origin.slug, to: route.destination.slug }} />
            </li>
          ))}
        </ul>
      )}
      <section className="mt-12 rounded-2xl bg-white p-6 shadow-card ring-1 ring-line">
        <h2 className="text-lg font-bold">
          About the {route.origin.name}–{route.destination.name} journey
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Shared taxis (Bolero, Sumo, Tempo Traveller) are the most common way to travel this route. With Pahadi Seat you see the
          exact departure time, boarding point and seats left before you leave home — and you can get down at any stop on the way
          {route.stops.length > 0 ? `, like ${route.stops.map((s) => s.location.name).join(" or ")}` : ""}, paying only for your part of the
          journey.
        </p>
      </section>
    </>
  );
}
