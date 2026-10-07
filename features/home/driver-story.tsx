"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, Bell, CalendarClock, CalendarPlus, IndianRupee, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: CalendarPlus, title: "Publish your journey", body: "Route, date, time, seats aur kiraya — 2 minute mein trip live. Sirf tab list karo jab aap sach mein ja rahe ho." },
  { icon: Bell, title: "Receive passenger bookings", body: "Har booking pe turant notification — naam, seats aur phone number ke saath." },
  { icon: Users, title: "Manage available seats", body: "Seats apne aap update hoti hain. Offline sawari ke liye seat block karo, ek tap mein." },
  { icon: CalendarClock, title: "Track upcoming trips", body: "Kaun kahan se baithega, kahan utrega — poori list stop ke hisaab se." },
  { icon: IndianRupee, title: "Earn from empty seats", body: "Jo seats khaali jaati thi, ab kamai karti hain. Platform fee passenger deta hai, aap nahi." },
];

function Step({ index, onActive, active }: { index: number; onActive: (i: number) => void; active: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { amount: 0.6 });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);
  const S = STEPS[index]!;
  return (
    <li ref={ref} className="flex items-center py-6 md:min-h-[60svh] md:py-0">
      <div className={cn("flex gap-5 transition-opacity duration-500", active ? "opacity-100" : "opacity-40")}>
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors duration-500",
            active ? "bg-marigold-400 text-forest-900" : "bg-white/10 text-forest-100",
          )}
        >
          <S.icon className="size-6" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-forest-300 uppercase">Step {index + 1}</p>
          <h3 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{S.title}</h3>
          <p className="mt-2 max-w-md text-[16px] leading-relaxed text-forest-100">{S.body}</p>
        </div>
      </div>
    </li>
  );
}

/** Illustrative phone showing what the driver sees at each step (sample data). */
function Phone({ step }: { step: number }) {
  const reduce = useReducedMotion();
  const booked = [0, 2, 5, 5, 7][step] ?? 0;
  const fade = reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -14 }, transition: { duration: 0.4 } };

  return (
    <div className="relative mx-auto aspect-[9/18.5] w-[260px] rounded-[44px] border-[10px] border-ink bg-paper shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] sm:w-[290px]">
      <div className="absolute top-2 left-1/2 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" aria-hidden />
      <div className="flex h-full flex-col overflow-hidden rounded-[34px] px-4 pt-10 pb-4 text-ink">
        <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">Sample · Driver app</p>
        <p className="mt-1 text-sm font-extrabold">DEHRADUN → RUDRAPRAYAG</p>
        <p className="text-xs text-muted">Tomorrow · 7:00 AM · Bolero</p>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          {[
            ["Total", 8],
            ["Booked", booked],
            ["Left", 8 - booked],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-paper-2 py-1.5">
              <motion.p key={`${l}${v}`} initial={reduce ? false : { scale: 1.25 }} animate={{ scale: 1 }} className="text-lg font-extrabold tabular-nums">
                {v}
              </motion.p>
              <p className="text-[10px] text-muted">{l}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border-2 text-[11px] font-bold transition-all duration-500",
                i < booked ? "border-forest-700 bg-forest-700 text-white" : "border-forest-200 text-forest-700",
              )}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div className="relative mt-3 flex-1">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" {...fade} className="rounded-2xl bg-forest-800 p-3 text-white">
                <p className="text-xs font-bold">Ride published ✓</p>
                <p className="mt-0.5 text-[11px] text-forest-200">Passengers on your route can now book.</p>
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="s1" {...fade} className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-line">
                <p className="flex items-center gap-1.5 text-xs font-bold">
                  <Bell className="size-3.5 text-marigold-500" aria-hidden /> New booking: 2 seats
                </p>
                <p className="mt-0.5 text-[11px] text-muted">Pooja · ISBT → Srinagar</p>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="s2" {...fade} className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-line">
                <p className="text-xs font-bold">Seat 8 blocked for an offline sawari</p>
                <p className="mt-0.5 text-[11px] text-muted">Availability updated for everyone.</p>
              </motion.div>
            )}
            {step === 3 && (
              <motion.ul key="s3" {...fade} className="space-y-1.5 text-[11px]">
                {[
                  ["Amit", "Rudraprayag"],
                  ["Pooja ×2", "Srinagar"],
                  ["Rahul", "Devprayag"],
                ].map(([n, d]) => (
                  <li key={n} className="flex justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-line">
                    <span className="font-semibold">{n}</span>
                    <span className="font-semibold text-marigold-700">↓ {d}</span>
                  </li>
                ))}
              </motion.ul>
            )}
            {step === 4 && (
              <motion.div key="s4" {...fade} className="rounded-2xl bg-marigold-50 p-3 ring-1 ring-marigold-100">
                <p className="text-[11px] text-marigold-700">This trip</p>
                <p className="text-2xl font-extrabold text-forest-900">₹4,550</p>
                <p className="text-[11px] text-marigold-700">from 7 seats that would have gone empty</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function DriverStory() {
  const [active, setActive] = useState(0);
  return (
    <section className="relative overflow-hidden bg-forest-900 text-white" aria-labelledby="drivers-heading">
      <div className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-forest-600/30 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
        <p className="text-xs font-bold tracking-[0.18em] text-marigold-400 uppercase">For drivers</p>
        <h2 id="drivers-heading" className="mt-3 max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
          Gaadi waise bhi ja rahi hai. <span className="font-display font-normal text-marigold-400 italic">Khaali seats kyun?</span>
        </h2>
        <p className="mt-5 max-w-xl text-lg text-forest-100">Apni upcoming trip list karo aur passengers pao — bina WhatsApp groups mein poochhe.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register?role=driver"
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-marigold-400 pr-2 pl-6 font-semibold text-forest-900 transition-colors hover:bg-marigold-500"
          >
            List Your Ride
            <span className="flex size-8 items-center justify-center rounded-full bg-forest-900/10 transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-4" aria-hidden />
            </span>
          </Link>
          <Link href="/drive" className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-white ring-1 ring-white/25 hover:bg-white/10">
            How it works for drivers
          </Link>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-6 px-4 pb-16 sm:px-6 md:grid-cols-[1fr_300px] md:gap-10 lg:grid-cols-[1fr_380px] lg:gap-16 lg:pb-24">
        <ol className="mt-6 md:mt-0">
          {STEPS.map((_, i) => (
            <Step key={i} index={i} active={i === active} onActive={setActive} />
          ))}
        </ol>
        <div className="h-fit py-4 md:sticky md:top-[max(5rem,calc(50svh-290px))] md:py-8">
          <div>
            <Phone step={active} />
          </div>
        </div>
      </div>
    </section>
  );
}
