export type ClassValue = string | number | false | null | undefined;

/** Tiny className joiner — keeps the dependency list short. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function routeKey(fromSlug: string, toSlug: string): string {
  return `${fromSlug}__${toSlug}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** "UK07TA4521" → "UK07 •• 4521" */
export function maskVehicleNumber(reg: string): string {
  const clean = reg.replace(/\s+/g, "").toUpperCase();
  if (clean.length <= 6) return clean;
  return `${clean.slice(0, 4)} •• ${clean.slice(-4)}`;
}

/** "9876543210" → "98765 •••••" */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return `${digits.slice(0, 5)} •••••`;
}

export function whatsappLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${withCountry}${q}`;
}

export function telLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `tel:+${digits.length === 10 ? `91${digits}` : digits}`;
}

export function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}
