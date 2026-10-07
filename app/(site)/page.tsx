import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
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
import { LinkButton } from "@/components/ui/button";
import { MountainArt } from "@/components/layout/brand";
import { SearchForm, SearchFormSkeleton } from "@/features/search/search-form";
import { getActiveLocations, getPopularRoutes } from "@/server/queries/rides";
import { formatDuration, formatPaise } from "@/lib/format";
import { Skeleton } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: { absolute: "Pahadi Seat — Kal ghar jaana hai? Book shared taxi seats in Uttarakhand" },
  description:
    "Dehradun ↔ Rudraprayag shared taxi seats from verified local drivers. See departure time, seats left, boarding point and fare — book your seat in a minute.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <WhyUs />
      <PopularRoutesSection />
      <ForDrivers />
      <Trust />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-paper via-paper to-forest-50/70">
      <MountainArt className="pointer-events-none absolute inset-x-0 bottom-0 h-48 w-full sm:h-64" />
      <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-6 sm:pt-16 sm:pb-32">
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-forest-700 shadow-sm ring-1 ring-forest-100">
          <span className="size-1.5 rounded-full bg-forest-500" aria-hidden />
          Now live: Dehradun ↔ Rudraprayag
        </p>
        <h1 className="mt-5 max-w-3xl text-[40px] leading-[1.05] font-extrabold tracking-tight text-forest-900 sm:text-6xl lg:text-7xl">
          Kal ghar jaana hai?
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2 sm:text-xl">
          Apne route ki available seats dekho, verified local drivers se seat book karo.
        </p>

        <div className="mt-8">
          <Suspense fallback={<SearchFormSkeleton />}>
            <HeroSearch />
          </Suspense>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="size-4 text-forest-600" aria-hidden /> Licence & RC checked drivers
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4 text-forest-600" aria-hidden /> Live seats left
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IndianRupee className="size-4 text-forest-600" aria-hidden /> Fixed fare, no bargaining
          </span>
          <Link href="/drive" className="inline-flex items-center gap-1 font-semibold text-forest-700 hover:underline">
            Become a Driver <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

async function HeroSearch() {
  const locations = await getActiveLocations();
  return <SearchForm locations={locations} />;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold tracking-[0.14em] text-forest-600 uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h2>
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
      <SectionHeading eyebrow="How it works" title="Teen step mein seat pakki" />
      <ol className="mt-10 grid gap-4 md:grid-cols-3" id="how">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-3xl border border-line bg-white p-6 shadow-card">
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
          </li>
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
    { icon: MapPinned, title: "Route-based travel", text: "Board at ISBT, get down at Devprayag or Rudraprayag. Driver knows your stop in advance." },
    { icon: CalendarCheck, title: "Easy booking", text: "Big buttons, simple steps, works on any phone. Pay the driver in cash or UPI at boarding." },
    { icon: Headset, title: "Local support", text: "Real people from Garhwal on call and WhatsApp when plans change." },
  ];
  return (
    <section className="border-y border-line bg-white" aria-labelledby="why">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading eyebrow="Why use us?" title="WhatsApp group mein poochhna band karo" description="Sab kuch ek jagah: kaunsi gaadi, kab, kahan se, kitni seat — aur driver kaun hai." />
        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3" id="why">
          {items.map((it) => (
            <div key={it.title} className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700 ring-1 ring-forest-100">
                <it.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-bold text-ink">{it.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">{it.text}</p>
              </div>
            </div>
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

function ForDrivers() {
  return (
    <section className="px-4 sm:px-6" aria-labelledby="drivers-heading">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-forest-800 px-6 py-12 text-white sm:px-12 sm:py-16">
        <svg viewBox="0 0 600 200" className="pointer-events-none absolute right-0 bottom-0 w-[520px] max-w-full opacity-20" aria-hidden>
          <path d="M0 200 120 80l70 60 110-110 90 90 70-50 140 130Z" fill="#b3d3bd" />
        </svg>
        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-marigold-400 uppercase">For drivers</p>
            <h2 id="drivers-heading" className="mt-3 text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">
              Gaadi waise bhi ja rahi hai. Khaali seats kyun?
            </h2>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-forest-100">
              Apni upcoming trip list karo aur passengers pao. Aapko pehle se pata hoga kitne log aa rahe hain, kahan se
              baithenge aur kahan utrenge.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/register?role=driver" variant="accent" size="lg">
                <Car className="size-5" aria-hidden /> List Your Ride
              </LinkButton>
              <LinkButton href="/drive" size="lg" className="bg-white/10 text-white hover:bg-white/20">
                How it works for drivers
              </LinkButton>
            </div>
          </div>
          <ul className="grid gap-3 text-[15px]">
            {[
              ["Free to list", "No subscription. Platform fee is paid by the passenger."],
              ["Passenger list with drop points", "Name, phone, seats and where each person gets down."],
              ["Your trip, your timing", "Create a trip only when you are actually going."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
                <p className="font-semibold">{t}</p>
                <p className="mt-0.5 text-sm text-forest-200">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
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
        {items.map((it) => (
          <div key={it.title} className="rounded-3xl border border-line bg-white p-6 text-center shadow-card">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-forest-50 text-forest-700">
              <it.icon className="size-6" aria-hidden />
            </span>
            <h3 className="mt-4 font-bold">{it.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{it.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
