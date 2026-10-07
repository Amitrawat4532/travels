import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarCheck,
  Car,
  FileCheck2,
  Headset,
  IndianRupee,
  Lock,
  MapPinned,
  MessageSquareHeart,
  MousePointerClick,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { connection } from "next/server";
import { MountainArt } from "@/components/layout/brand";
import { SearchForm, SearchFormSkeleton } from "@/features/search/search-form";
import { getActiveLocations, getPopularRoutes, getRouteBySlug, getUpcomingRidesForRoute } from "@/server/queries/rides";
import { formatDuration, formatPaise } from "@/lib/format";
import { Skeleton } from "@/components/ui/misc";
import { CinematicHero } from "@/features/home/cinematic-hero";
import { RouteMap } from "@/features/home/route-map";
import { DriverStory } from "@/features/home/driver-story";
import { Reveal } from "@/features/home/reveal";
import { RideCard, RideCardSkeleton } from "@/features/rides/ride-card";

export const metadata: Metadata = {
  title: { absolute: "Pahadi Seat — Kal ghar jaana hai? Book shared taxi seats in Uttarakhand" },
  description:
    "Dehradun ↔ Chamoli and Rudraprayag shared taxi seats from verified local drivers. See departure time, seats left, boarding point and fare — book your seat in a minute.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <CinematicHero
        search={
          <Suspense fallback={<SearchFormSkeleton />}>
            <HeroSearch />
          </Suspense>
        }
      />
      <RouteSection />
      <NextRidesSection />
      <HowItWorks />
      <WhyUs />
      <PopularRoutesSection />
      <DriverStory />
      <Trust />
    </>
  );
}

async function HeroSearch() {
  const locations = await getActiveLocations();
  return <SearchForm locations={locations} />;
}

function RouteSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="route-heading">
      <Reveal>
        <SectionHeading eyebrow="The connection" title="Dehradun se Chamoli, har padaav pe seat" description="Rishikesh, Devprayag, Srinagar, Rudraprayag, Gauchar, Karnaprayag — board at any stop, get down at any stop after it. You pay only for your part of the journey." />
      </Reveal>
      <h2 id="route-heading" className="sr-only">
        Dehradun to Chamoli route
      </h2>
      <Reveal className="mt-10" delay={0.1}>
        <Suspense fallback={<Skeleton className="h-96 rounded-[28px]" />}>
          <RouteMapLoader />
        </Suspense>
      </Reveal>
    </section>
  );
}

async function RouteMapLoader() {
  const route = (await getRouteBySlug("dehradun-to-chamoli")) ?? (await getRouteBySlug("dehradun-to-rudraprayag"));
  if (!route || route.origin.latitude == null || route.destination.latitude == null) return null;
  const all = [
    { loc: route.origin, km: 0, minutes: 0 },
    ...route.stops.map((s) => ({ loc: s.location, km: s.distanceFromOriginKm, minutes: s.minutesFromOrigin })),
    { loc: route.destination, km: route.distanceKm, minutes: route.durationMinutes },
  ];
  if (all.some((p) => p.loc.latitude == null || p.loc.longitude == null)) return null;
  return (
    <RouteMap
      totalKm={route.distanceKm}
      totalMinutes={route.durationMinutes}
      stops={all.map((p) => ({
        name: p.loc.name,
        lat: p.loc.latitude!,
        lng: p.loc.longitude!,
        km: p.km,
        minutes: p.minutes,
        farePaise: Math.round((route.suggestedFarePaise * p.km) / route.distanceKm / 1000) * 1000,
      }))}
    />
  );
}

function NextRidesSection() {
  return (
    <section className="border-y border-line bg-white" aria-labelledby="next-rides">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Reveal>
            <SectionHeading eyebrow="Available rides" title="Agli gaadiyan, live seats ke saath" />
          </Reveal>
          <Link href="/search?from=dehradun&to=chamoli" className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:underline">
            See all rides <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <h2 id="next-rides" className="sr-only">
          Next rides from Dehradun to Chamoli
        </h2>
        <Suspense
          fallback={
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <RideCardSkeleton />
              <RideCardSkeleton />
            </div>
          }
        >
          <NextRides />
        </Suspense>
      </div>
    </section>
  );
}

async function NextRides() {
  const route = (await getRouteBySlug("dehradun-to-chamoli")) ?? (await getRouteBySlug("dehradun-to-rudraprayag"));
  if (!route) return null;
  await connection();
  const rides = await getUpcomingRidesForRoute(route.originId, route.destinationId, 4);
  const now = new Date();
  if (rides.length === 0) {
    return (
      <p className="mt-8 rounded-2xl border border-dashed border-forest-200 p-8 text-center text-muted">
        Is route ke liye abhi koi ride available nahi hai.{" "}
        <Link href={`/search?from=${route.origin.slug}&to=${route.destination.slug}`} className="font-semibold text-forest-700 underline">
          Get notified
        </Link>
      </p>
    );
  }
  return (
    <ul className="mt-8 grid gap-4 lg:grid-cols-2">
      {rides.map((r, i) => (
        <Reveal as="li" key={r.id} delay={i * 0.08} className="min-w-0">
          <RideCard ride={r} now={now} query={{ from: route.origin.slug, to: route.destination.slug }} />
        </Reveal>
      ))}
    </ul>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold tracking-[0.14em] text-forest-600 uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-[44px] sm:leading-[1.08]">{title}</h2>
      {description && <p className="mt-3 text-[17px] leading-relaxed text-muted">{description}</p>}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: "Search your route",
      text: "From, to aur date daalo. Hum dikhayenge kaun si gaadi kab nikal rahi hai aur kitni seats khaali hain.",
    },
    {
      icon: MousePointerClick,
      title: "Choose a verified ride",
      text: "Driver ka naam, rating, gaadi, boarding point aur fare — sab pehle se pata. Koi phone-call ki zaroorat nahi.",
    },
    {
      icon: Ticket,
      title: "Book your seat",
      text: "Apni seat chuno, drop point batao aur confirm karo. Booking ID aur driver ka number turant milta hai.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="how">
      <Reveal>
        <SectionHeading eyebrow="How it works" title="Teen step mein seat pakki" />
      </Reveal>
      <ol className="mt-10 grid gap-4 md:grid-cols-3" id="how">
        {steps.map((s, i) => (
          <Reveal as="li" key={s.title} delay={i * 0.1} className="relative rounded-3xl border border-line bg-white p-6 shadow-card transition-shadow duration-500 hover:shadow-lift">
            <span className="absolute top-6 right-6 text-5xl font-extrabold text-forest-50 select-none" aria-hidden>
              {i + 1}
            </span>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-forest-700 text-white">
              <s.icon className="size-6" aria-hidden />
            </span>
            <h3 className="mt-5 text-lg font-bold">
              <span className="sr-only">Step {i + 1}: </span>
              {s.title}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

function WhyUs() {
  const items = [
    { icon: ShieldCheck, title: "Verified local drivers", text: "Driving licence, RC, insurance and permit checked before a driver can list a ride." },
    { icon: Users, title: "Real-time seat availability", text: "Seats update the moment someone books or cancels. What you see is what's left." },
    { icon: IndianRupee, title: "Transparent pricing", text: "Fare per seat shown upfront — even for partial routes like Dehradun → Srinagar." },
    { icon: MapPinned, title: "Route-based travel", text: "Board at ISBT, get down at Srinagar, Rudraprayag or Karnaprayag. Driver knows your stop in advance." },
    { icon: CalendarCheck, title: "Easy booking", text: "Big buttons, simple steps, works on any phone. Pay the driver in cash or UPI at boarding." },
    { icon: Headset, title: "Local support", text: "Real people from Garhwal on call and WhatsApp when plans change." },
  ];
  return (
    <section className="border-y border-line bg-white" aria-labelledby="why">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading eyebrow="Why use us?" title="WhatsApp group mein poochhna band karo" description="Sab kuch ek jagah: kaunsi gaadi, kab, kahan se, kitni seat — aur driver kaun hai." />
        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" id="why">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={(i % 3) * 0.08} className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700 ring-1 ring-forest-100">
                <it.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-bold text-ink">{it.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">{it.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PopularRoutesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="routes-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading eyebrow="Popular routes" title="Jahan log roz jaate hain" />
        <Link href="/routes" className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:underline">
          All routes <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-3xl" />
            ))}
          </div>
        }
      >
        <PopularRoutes />
      </Suspense>
    </section>
  );
}

async function PopularRoutes() {
  const routes = await getPopularRoutes();
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2">
      {routes.map((r) => (
        <li key={r.id}>
          <Link
            href={`/routes/${r.slug}`}
            className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-card transition-shadow hover:shadow-lift"
          >
            <MountainArt className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full opacity-60" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-extrabold tracking-tight text-forest-900">
                  {r.origin.name} <span className="text-forest-400">→</span> {r.destination.name}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {r.distanceKm} km · {formatDuration(r.durationMinutes)}
                  {r.stops.length > 0 && <> · via {r.stops.map((s) => s.location.name).join(", ")}</>}
                </p>
              </div>
              {r.isPopular && (
                <span className="inline-flex items-center gap-1 rounded-full bg-marigold-50 px-2.5 py-1 text-xs font-semibold text-marigold-700">
                  <Sparkles className="size-3" aria-hidden /> Popular
                </span>
              )}
            </div>
            <div className="relative mt-8 flex items-end justify-between">
              <p className="text-sm text-muted">
                from <span className="text-xl font-bold text-ink">{formatPaise(r.suggestedFarePaise)}</span> / seat
              </p>
              <span className="inline-flex items-center gap-1 rounded-xl bg-forest-700 px-3 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-forest-800">
                See rides <ArrowRight className="size-4" aria-hidden />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Trust() {
  const items = [
    { icon: FileCheck2, title: "Driver verification", text: "Licence and identity reviewed by our team before approval." },
    { icon: Car, title: "Vehicle verification", text: "RC, insurance and taxi permit checked for every vehicle." },
    { icon: MessageSquareHeart, title: "Passenger reviews", text: "Only passengers who completed a trip can rate the driver." },
    { icon: Lock, title: "Secure booking", text: "Your phone number is shared only with the driver of your ride." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="trust-heading">
      <div className="text-center">
        <p className="text-xs font-bold tracking-[0.14em] text-forest-600 uppercase">Bharosa</p>
        <h2 id="trust-heading" className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Safar pahad ka, bharosa apno ka
        </h2>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={i * 0.08} className="rounded-3xl border border-line bg-white p-6 text-center shadow-card">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-forest-50 text-forest-700">
              <it.icon className="size-6" aria-hidden />
            </span>
            <h3 className="mt-4 font-bold">{it.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{it.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
