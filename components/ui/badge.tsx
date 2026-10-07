import type { ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "green" | "amber" | "red" | "blue" | "dark";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-paper-2 text-ink-2 ring-line",
  green: "bg-forest-50 text-forest-700 ring-forest-200",
  amber: "bg-marigold-50 text-marigold-700 ring-marigold-100",
  red: "bg-danger-50 text-danger-700 ring-danger-500/20",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  dark: "bg-forest-800 text-white ring-forest-800",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function VerifiedBadge({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Badge tone="green" className={className}>
      <BadgeCheck className="size-3.5" aria-hidden />
      {compact ? "Verified" : "Verified Driver"}
    </Badge>
  );
}

const STATUS_TONE: Record<string, BadgeTone> = {
  CONFIRMED: "green",
  COMPLETED: "dark",
  PENDING: "amber",
  CANCELLED: "red",
  REFUNDED: "blue",
  SCHEDULED: "green",
  IN_PROGRESS: "blue",
  VERIFIED: "green",
  APPROVED: "green",
  REJECTED: "red",
  SUSPENDED: "red",
  DRAFT: "neutral",
  ACTIVE: "green",
  OPEN: "amber",
  RESOLVED: "green",
  CLOSED: "neutral",
  PAID: "green",
  FAILED: "red",
  BOARDED: "green",
  NO_SHOW: "red",
  NOT_BOARDED: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "On the way",
  NOT_BOARDED: "Not boarded",
  NO_SHOW: "No-show",
  PENDING: "Pending",
  DRAFT: "Not submitted",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = STATUS_LABEL[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} className={className}>
      {label}
    </Badge>
  );
}
