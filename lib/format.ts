/**
 * Formatting helpers. All dates are rendered in Asia/Kolkata regardless of
 * server timezone, so a 7:00 AM departure always reads 7:00 AM.
 */
export const TIMEZONE = "Asia/Kolkata";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPaise(paise: number): string {
  return inr.format(Math.round(paise / 100));
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIMEZONE,
  })
    .format(new Date(date))
    .toUpperCase();
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TIMEZONE,
  }).format(new Date(date));
}

export function formatDateLong(date: Date | string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} · ${formatTime(date)}`;
}

export function formatShortDay(date: Date | string): { day: string; month: string } {
  const d = new Date(date);
  return {
    day: new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: TIMEZONE }).format(d),
    month: new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: TIMEZONE })
      .format(d)
      .toUpperCase(),
  };
}

/** "YYYY-MM-DD" for a Date as seen in IST. */
export function toIstDateString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIMEZONE,
  }).format(date);
  return parts; // en-CA gives YYYY-MM-DD
}

/** "HH:mm" (24h) for a Date as seen in IST. */
export function toIstTimeString(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  }).format(date);
}

/** Build a UTC Date from an IST calendar date + time ("2026-10-08", "07:00"). */
export function istToDate(dateStr: string, timeStr = "00:00"): Date {
  return new Date(`${dateStr}T${timeStr}:00+05:30`);
}

/** Start and end (exclusive) of an IST calendar day as UTC Dates. */
export function istDayRange(dateStr: string): { start: Date; end: Date } {
  const start = istToDate(dateStr, "00:00");
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function relativeDayLabel(date: Date | string, now = new Date()): string {
  const target = toIstDateString(new Date(date));
  const today = toIstDateString(now);
  const tomorrow = toIstDateString(new Date(now.getTime() + 86_400_000));
  if (target === today) return "Today";
  if (target === tomorrow) return "Tomorrow";
  return formatDate(date);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function timeAgo(date: Date | string, now = new Date()): string {
  const diff = Math.round((now.getTime() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
  return formatDate(date);
}
