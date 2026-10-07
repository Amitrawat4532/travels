import type { Metadata } from "next";
import { BadgeCheck, CalendarPlus, IndianRupee, ListChecks, MapPinned, Smartphone, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { MountainArt } from "@/components/layout/brand";

export const metadata: Metadata = {
  title: "Become a driver — fill your empty seats",
  description: "Gaadi waise bhi ja rahi hai. Khaali seats kyun? List your upcoming trip on Pahadi Seat and get passengers on your route. Free for drivers.",
  alternates: { canonical: "/drive" },
};

export default function DrivePage() {
  const steps = [
    { icon: Smartphone, t: "Register", d: "Create a driver account with your mobile number." },
    { icon: ListChecks, t: "Submit documents", d: "Licence, RC, insurance, permit and a few photos of your gaadi." },
    { icon: BadgeCheck, t: "Get verified", d: "Our team reviews within 24 hours. You get the ✓ Verified Driver badge." },
    { icon: CalendarPlus, t: "List your trip", d: "Route, date, time, seats and fare — publish in 2 minutes." },
  ];
  const perks = [
    { icon: Users, t: "Know who's coming", d: "Passenger list with names, phone numbers and seats before you start." },
    { icon: MapPinned, t: "Know where they get down", d: "Every passenger's drop point — Srinagar, Devprayag or the last stop." },
    { icon: IndianRupee, t: "Fill seats, earn more", d: "No subscription. The platform fee is paid by passengers, not you." },
  ];
  return (
    <>
      <section className="relative overflow-hidden bg-forest-800 text-white">
        <MountainArt className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full opacity-20" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-bold tracking-[0.14em] text-marigold-400 uppercase">For drivers</p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">Gaadi waise bhi ja rahi hai. Khaali seats kyun?</h1>
          <p className="mt-5 max-w-2xl text-lg text-forest-100">Apni upcoming trip list karo aur passengers pao. Dehradun, Rishikesh, Srinagar, Rudraprayag — jahan aap ja rahe ho, wahan ke passengers.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/register?role=driver" variant="accent" size="lg">List Your Ride</LinkButton>
            <LinkButton href="/login?next=/driver" size="lg" className="bg-white/10 text-white hover:bg-white/20">Driver login</LinkButton>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight">Shuru kaise karein</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <span className="text-sm font-bold text-forest-600">Step {i + 1}</span>
              <s.icon className="mt-3 size-7 text-forest-700" aria-hidden />
              <h3 className="mt-3 font-bold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {perks.map((p) => (
            <div key={p.t}>
              <p.icon className="size-7 text-forest-600" aria-hidden />
              <h3 className="mt-3 text-lg font-bold">{p.t}</h3>
              <p className="mt-1 text-muted">{p.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 rounded-3xl bg-forest-50 p-6 text-center sm:p-10">
          <h2 className="text-2xl font-extrabold">Kal ki trip aaj list karo</h2>
          <p className="mt-2 text-ink-2">Registration is free and takes about 5 minutes.</p>
          <LinkButton href="/register?role=driver" size="lg" className="mt-5">Create driver account</LinkButton>
        </div>
      </section>
    </>
  );
}
