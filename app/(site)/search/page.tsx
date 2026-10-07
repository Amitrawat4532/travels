import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { BellRing, CarFront, LogIn } from "lucide-react";
import { SearchForm, SearchFormSkeleton } from "@/features/search/search-form";
import { RideCard, RideCardSkeleton } from "@/features/rides/ride-card";
import { getActiveLocations, searchRides } from "@/server/queries/rides";
import { searchParamsSchema } from "@/validation/search";
import { getCurrentUser } from "@/auth/session";
import { track } from "@/server/analytics";
import { db } from "@/server/db";
import { EmptyState } from "@/components/ui/misc";
import { ActionButton } from "@/components/ui/action-button";
import { LinkButton } from "@/components/ui/button";
import { createRideAlertAction, toggleSavedRouteAction } from "@/features/passenger/actions";
import { formatDate, formatDateLong, toIstDateString } from "@/lib/format";
import { cn, routeKey } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Search rides",
  description: "Find shared taxi seats on your route. Live seat availability from verified drivers across Uttarakhand.",
  alternates: { canonical: "/search" },
};

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <Suspense
        fallback={
          <>
            <SearchFormSkeleton />
            <div className="mt-8 space-y-4">
              <RideCardSkeleton />
              <RideCardSkeleton />
            </div>
          </>
        }
      >
        <SearchContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchContent({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const query = searchParamsSchema.parse(flat);
  await connection();
  const [locations, result, user] = await Promise.all([getActiveLocations(), searchRides(query), getCurrentUser()]);
  const now = new Date();

  if (result.from && result.to) {
    track({ type: "SEARCH", userId: user?.id, routeKey: routeKey(result.from.slug, result.to.slug), metadata: { date: query.date ?? null, passengers: query.passengers } });
  }

  const hasRoute = Boolean(result.from && result.to);
  const dayChips = Array.from({ length: 7 }, (_, i) => toIstDateString(new Date(now.getTime() + i * 86_400_000)));
  const chipHref = (date?: string) => {
    const p = new URLSearchParams();
    if (result.from) p.set("from", result.from.slug);
    if (result.to) p.set("to", result.to.slug);
    p.set("passengers", String(query.passengers));
    if (date) p.set("date", date);
    return `/search?${p}`;
  };

  const isSaved =
    user && result.from && result.to
      ? await db.savedRoute.findFirst({
          where: { userId: user.id, fromId: result.from.id, toId: result.to.id },
          select: { id: true },
        })
      : null;

  return (
    <>
      <SearchForm
        locations={locations}
        variant="compact"
        defaults={{ from: result.from?.slug ?? query.from, to: result.to?.slug ?? query.to, date: query.date, passengers: query.passengers }}
      />

      {hasRoute && (
        <nav className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Choose travel date">
          <Link
            href={chipHref()}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              !query.date ? "border-forest-700 bg-forest-700 text-white" : "border-line bg-white text-ink-2 hover:border-forest-300",
            )}
          >
            Next 14 days
          </Link>
          {dayChips.map((d, i) => (
            <Link
              key={d}
              href={chipHref(d)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
                query.date === d ? "border-forest-700 bg-forest-700 text-white" : "border-line bg-white text-ink-2 hover:border-forest-300",
              )}
            >
              {i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatDate(new Date(`${d}T12:00:00+05:30`))}
            </Link>
          ))}
        </nav>
      )}

      <section className="mt-6" aria-live="polite">
        {hasRoute && (
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                {result.from!.name} → {result.to!.name}
              </h1>
              <p className="text-sm text-muted">
                {query.date ? formatDateLong(new Date(`${query.date}T12:00:00+05:30`)) : "Upcoming rides"} ·{" "}
                {result.rides.length} {result.rides.length === 1 ? "ride" : "rides"} with {query.passengers}+{" "}
                {query.passengers === 1 ? "seat" : "seats"}
              </p>
            </div>
            {user?.role === "PASSENGER" && (
              <ActionButton
                action={toggleSavedRouteAction}
                fields={{ fromSlug: result.from!.slug, toSlug: result.to!.slug }}
                variant="ghost"
              >
                {isSaved ? "★ Saved route" : "☆ Save this route"}
              </ActionButton>
            )}
          </div>
        )}

        {!hasRoute ? (
          <EmptyState
            icon={<CarFront className="size-7" />}
            title="Kahan jaana hai?"
            description="Choose where you're travelling from and to, then tap Search Rides."
          />
        ) : result.rides.length === 0 ? (
          <EmptyState
            icon={<CarFront className="size-7" />}
            title="Is route ke liye abhi koi ride available nahi hai."
            description={
              query.date
                ? "Drivers usually list rides a day or two before travelling. Try another date or ask us to notify you."
                : "No upcoming rides yet. Ask us to notify you as soon as a driver lists one."
            }
            action={
              user ? (
                <ActionButton
                  action={createRideAlertAction}
                  fields={{ fromSlug: result.from!.slug, toSlug: result.to!.slug, date: query.date ?? dayChips[1]! }}
                  variant="primary"
                  size="md"
                >
                  <BellRing className="size-4" aria-hidden /> Notify me when a ride becomes available
                </ActionButton>
              ) : (
                <LinkButton href={`/login?next=${encodeURIComponent(chipHref(query.date))}`}>
                  <LogIn className="size-4" aria-hidden /> Log in to get notified
                </LinkButton>
              )
            }
          />
        ) : (
          <ul className="space-y-4">
            {result.rides.map((ride) => (
              <li key={ride.id}>
                <RideCard ride={ride} now={now} query={{ from: result.from!.slug, to: result.to!.slug, passengers: query.passengers }} />
              </li>
            ))}
          </ul>
        )}

        {result.soldOut.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-muted">Not enough seats for {query.passengers}</h2>
            <ul className="space-y-4">
              {result.soldOut.map((ride) => (
                <li key={ride.id}>
                  <RideCard ride={ride} now={now} soldOut query={{ from: result.from!.slug, to: result.to!.slug, passengers: 1 }} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
