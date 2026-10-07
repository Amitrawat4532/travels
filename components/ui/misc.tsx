import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = 44,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.max(12, size * 0.36) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- authenticated, dynamic image route
    return <img src={src} alt={name} style={style} className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span
      style={style}
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-forest-100 font-semibold text-forest-800 ring-2 ring-white",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  if (!count) {
    return <span className={cn("text-sm text-muted", className)}>New driver</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-semibold text-ink", className)}>
      <Star className="size-4 fill-marigold-400 text-marigold-400" aria-hidden />
      {value.toFixed(1)}
      <span className="font-normal text-muted">({count})</span>
    </span>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i <= Math.round(value) ? "fill-marigold-400 text-marigold-400" : "text-line"}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-paper-2", className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-forest-200 bg-white/60 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "error";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-forest-200 bg-forest-50 text-forest-800",
    success: "border-forest-300 bg-forest-50 text-forest-800",
    warning: "border-marigold-100 bg-marigold-50 text-marigold-700",
    error: "border-danger-500/30 bg-danger-50 text-danger-700",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted uppercase sm:text-[13px]">{label}</p>
        {icon && <span className="text-forest-500">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink tabular-nums sm:text-[28px]">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function KeyValue({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}
