"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, BadgeCheck, Car, IndianRupee, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroFallbackArt } from "./hero-fallback";
import type { SceneProgress } from "./scene/himalaya-scene";

const HimalayaScene = dynamic(() => import("./scene/himalaya-scene"), { ssr: false, loading: () => null });

type Support = "pending" | "high" | "low" | "none";

const noop = () => () => {};

/** Decide once, on the client, whether and how richly to render 3D. */
function detectSupport(): Support {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "none";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return "none";
  if ((nav.deviceMemory ?? 8) <= 2) return "none";
  try {
    const c = document.createElement("canvas");
    if (!(c.getContext("webgl2") || c.getContext("webgl"))) return "none";
  } catch {
    return "none";
  }
  const small = window.matchMedia("(max-width: 768px)").matches;
  const weakCpu = (navigator.hardwareConcurrency ?? 8) <= 4;
  return small || weakCpu ? "low" : "high";
}

let cachedSupport: Support | null = null;
function useSceneSupport(): Support {
  return useSyncExternalStore(
    noop,
    () => (cachedSupport ??= detectSupport()),
    () => "pending",
  );
}

const STORY = [
  {
    id: "pahad",
    eyebrow: "01 · Pahad",
    title: "Har mod pe ek kahani.",
    body: "Dehradun ki ghaati se Chamoli ki pahadiyon tak — 250 km ke pahadi raste, jahan har roz sainkdon gaadiyan khaali seats ke saath chalti hain.",
    align: "left" as const,
  },
  {
    id: "safar",
    eyebrow: "02 · Safar",
    title: "Gaadi pehle se ja rahi hai.",
    body: "Bolero, Sumo, Tempo Traveller — local drivers jo yeh raasta roz chalte hain. Aap bas dekho kab nikal rahi hai aur kitni seats bachi hain.",
    align: "right" as const,
  },
  {
    id: "jodna",
    eyebrow: "03 · Jodna",
    title: "Dehradun se Chamoli, seat-by-seat.",
    body: "Rishikesh, Srinagar, Rudraprayag, Karnaprayag — jahan utarna ho, wahan tak ka kiraya. Driver ko pehle se pata, aapko kahan chhodna hai.",
    align: "left" as const,
  },
];

export function CinematicHero({ search }: { search: ReactNode }) {
  const support = useSceneSupport();
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLElement>(null);
  const progress = useRef<SceneProgress>({ scroll: 0, intro: 0, pointerX: 0, pointerY: 0 });
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const show3d = support === "high" || support === "low";

  // Scroll progress across hero + story panels drives the camera.
  // GSAP is only needed with the 3D scene, so it is loaded lazily alongside it.
  useEffect(() => {
    if (!show3d || !wrapRef.current) return;
    let kill: (() => void) | undefined;
    let cancelled = false;
    const trigger = wrapRef.current;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const st = ScrollTrigger.create({
        trigger,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          progress.current.scroll = self.progress;
        },
      });
      kill = () => st.kill();
    });
    return () => {
      cancelled = true;
      kill?.();
    };
  }, [show3d]);

  // Cinematic intro once the first frame is on screen.
  useEffect(() => {
    if (!ready) return;
    let kill: (() => void) | undefined;
    let cancelled = false;
    import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const tween = gsap.to(progress.current, { intro: 1, duration: 5.2, ease: "power2.inOut" });
      kill = () => tween.kill();
    });
    return () => {
      cancelled = true;
      kill?.();
    };
  }, [ready]);

  // Pause rendering when the hero is off-screen or the tab is hidden.
  useEffect(() => {
    if (!show3d || !wrapRef.current) return;
    let visible = true;
    const update = () => setActive(visible && document.visibilityState === "visible");
    const io = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting);
      update();
    });
    io.observe(wrapRef.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [show3d]);

  // Subtle pointer parallax (desktop scene only).
  useEffect(() => {
    if (support !== "high") return;
    const onMove = (e: PointerEvent) => {
      progress.current.pointerX = e.clientX / window.innerWidth - 0.5;
      progress.current.pointerY = -(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [support]);

  // Pure-CSS entrance: runs before hydration so the hero text (LCP) is never blocked on JS.
  const rise = (delay: number) => ({ style: { animationDelay: `${delay}s` } });

  return (
    <section ref={wrapRef} className="relative" aria-label="Pahadi Seat — find a shared taxi seat">
      {/* Background layer: sticky for the whole story */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="sticky top-0 h-svh overflow-hidden">
        <HeroFallbackArt className="absolute inset-0 size-full" />
        {show3d && (
          <div className={cn("absolute inset-0 transition-opacity duration-[1600ms] ease-out", ready ? "opacity-100" : "opacity-0")}>
            <HimalayaScene progress={progress} active={active} quality={support === "high" ? "high" : "low"} onReady={() => setReady(true)} />
          </div>
        )}
        {/* Legibility veils */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#f5f1e8]/90 via-[#f5f1e8]/45 to-transparent max-lg:bg-gradient-to-b max-lg:from-[#f5f1e8]/90 max-lg:via-[#f5f1e8]/40 max-lg:to-[#f5f1e8]/10" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-paper" />
        </div>
        {/* Fade the pinned scene into the page at the end of the story */}
        <div className="absolute inset-x-0 bottom-0 h-[40svh] bg-gradient-to-b from-transparent to-paper" />
      </div>

      {/* Hero */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col justify-center px-4 py-12 sm:px-6">
        <p
          {...rise(0.1)}
          className="motion-safe:animate-rise inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-forest-700 shadow-sm ring-1 ring-forest-900/10 backdrop-blur"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-forest-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-forest-500" />
          </span>
          Now live · Dehradun ↔ Chamoli
        </p>
        <h1
          {...rise(0.2)}
          className="motion-safe:animate-rise mt-5 max-w-3xl text-[44px] leading-[1.02] font-extrabold tracking-[-0.035em] text-forest-900 sm:text-7xl lg:text-[88px]"
        >
          Kal ghar <span className="font-display font-normal tracking-normal text-forest-700 italic">jaana</span> hai?
        </h1>
        <p {...rise(0.3)} className="motion-safe:animate-rise mt-5 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl">
          Apne route ki available seats dekho aur trusted local drivers ke saath apna safar book karo.
        </p>
        <div {...rise(0.4)} className="motion-safe:animate-rise mt-7 flex flex-wrap gap-3">
          <a
            href="#find-ride"
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-forest-800 pr-2 pl-6 text-[15px] font-semibold text-white shadow-lift transition-colors hover:bg-forest-900"
          >
            Find Your Ride
            <span className="flex size-8 items-center justify-center rounded-full bg-white/10 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:bg-marigold-400 group-hover:text-forest-900">
              <ArrowRight className="size-4" aria-hidden />
            </span>
          </a>
          <Link
            href="/drive"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-white/70 px-6 text-[15px] font-semibold text-forest-900 ring-1 ring-forest-900/15 backdrop-blur transition hover:bg-white"
          >
            <Car className="size-4" aria-hidden /> List Your Trip
          </Link>
        </div>

        <div {...rise(0.5)} id="find-ride" className="motion-safe:animate-rise mt-10 scroll-mt-24">
          {search}
        </div>

        <ul
          {...rise(0.6)}
          className="motion-safe:animate-rise mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink-2"
          aria-label="Why Pahadi Seat"
        >
          <li className="inline-flex items-center gap-1.5">
            <BadgeCheck className="size-4 text-forest-600" aria-hidden /> Licence & RC verified
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users className="size-4 text-forest-600" aria-hidden /> Live seats left
          </li>
          <li className="inline-flex items-center gap-1.5">
            <IndianRupee className="size-4 text-forest-600" aria-hidden /> Fixed fare, pay at boarding
          </li>
        </ul>
      </div>

      {/* Story panels — the camera travels with them */}
      <div className="relative z-10">
        {STORY.map((s) => (
          <div key={s.id} className={cn("mx-auto flex min-h-[85svh] max-w-6xl items-center px-4 sm:px-6", s.align === "right" && "lg:justify-end")}>
            <motion.article
              initial={reduce ? false : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.5, once: false }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-md rounded-[28px] bg-white/70 p-7 shadow-lift ring-1 ring-white/60 backdrop-blur-xl sm:p-9"
            >
              <p className="text-xs font-bold tracking-[0.18em] text-forest-600 uppercase">{s.eyebrow}</p>
              <h2 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight text-forest-900 sm:text-4xl">{s.title}</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ink-2">{s.body}</p>
            </motion.article>
          </div>
        ))}
        <div className="h-[20svh]" aria-hidden />
      </div>
    </section>
  );
}
