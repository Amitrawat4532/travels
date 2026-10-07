import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="#1b4730" />
      <path d="M5 29 15 15l5.5 7 4-5L35 29Z" fill="#82b493" />
      <path d="M15 15l3.2 4.1-2.3 2.5-2.6-3.6Z" fill="#faf8f3" opacity=".9" />
      <circle cx="29" cy="11" r="3" fill="#eab04a" />
      <path d="M8 32.5h24" stroke="#faf8f3" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="3.5 3" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label={`${APP_NAME} home`}>
      <LogoMark />
      <span className={cn("text-[19px] font-extrabold tracking-tight", light ? "text-white" : "text-forest-800")}>
        Pahadi<span className={light ? "text-marigold-400" : "text-forest-500"}>Seat</span>
      </span>
    </Link>
  );
}

/** Layered Himalayan ridgelines — subtle, used in hero and section dividers. */
export function MountainArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className={className} aria-hidden>
      <path
        d="M0 230 120 150l80 50 140-120 110 90 90-60 170 130 130-110 120 70 150-140 140 120 90-50 100 70V320H0Z"
        fill="#d9e9de"
        opacity=".55"
      />
      <path
        d="m0 260 160-70 90 40 170-90 120 80 130-50 150 90 140-80 160 70 130-60 190 80V320H0Z"
        fill="#b3d3bd"
        opacity=".6"
      />
      <path d="m0 290 200-40 160 30 220-50 200 50 180-30 240 40 240-30V320H0Z" fill="#82b493" opacity=".45" />
    </svg>
  );
}
