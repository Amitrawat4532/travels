"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bookmark,
  Building2,
  CalendarClock,
  Car,
  CircleUser,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquareWarning,
  PlusCircle,
  Route as RouteIcon,
  Settings,
  ShieldCheck,
  Star,
  Ticket,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/features/auth/actions";
import { Logo } from "./brand";

const ICONS = {
  dashboard: LayoutDashboard,
  trips: CalendarClock,
  create: PlusCircle,
  bookings: Ticket,
  passengers: Users,
  earnings: Wallet,
  vehicle: Car,
  profile: CircleUser,
  settings: Settings,
  upcoming: CalendarClock,
  past: History,
  saved: Bookmark,
  drivers: ShieldCheck,
  vehicles: Car,
  routes: RouteIcon,
  locations: MapPin,
  complaints: MessageSquareWarning,
  reviews: Star,
  analytics: BarChart3,
  users: Users,
  notifications: Bell,
  list: ClipboardList,
  org: Building2,
} as const;

export type NavIcon = keyof typeof ICONS;
export type NavItem = { href: string; label: string; icon: NavIcon; mobile?: boolean; exact?: boolean };

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function DashboardShell({
  title,
  nav,
  userSlot,
  children,
}: {
  title: string;
  nav: NavItem[];
  userSlot?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [pathname]);

  // Most specific match wins (so /driver/trips/new highlights "Create trip", not "My trips").
  const active = [...nav]
    .filter((n) => isActive(pathname, n))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const mobileItems = nav.filter((n) => n.mobile).slice(0, 4);

  return (
    <div className="min-h-dvh bg-paper">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <p className="px-5 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</p>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label={`${title} navigation`}>
          {nav.map((item) => {
            const Icon = ICONS[item.icon];
            const on = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-medium transition-colors",
                  on ? "bg-forest-50 text-forest-800" : "text-ink-2 hover:bg-paper-2",
                )}
              >
                <Icon className={cn("size-[18px]", on ? "text-forest-600" : "text-muted")} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-3">
          {userSlot}
          <form action={logoutAction}>
            <button
              type="submit"
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-danger-50 hover:text-danger-700"
            >
              <LogOut className="size-[18px]" aria-hidden /> Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
        <Logo className="[&_svg]:size-8 [&_span]:text-[17px]" />
        <div className="flex items-center gap-1">
          <Link href="/notifications" aria-label="Notifications" className="flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2">
            <Bell className="size-5" />
          </Link>
        </div>
      </header>

      <main className="pb-24 lg:pb-10 lg:pl-64 print:p-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label={`${title} quick navigation`}
      >
        <div className="grid grid-cols-5">
          {mobileItems.map((item) => {
            const Icon = ICONS[item.icon];
            const on = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  on ? "text-forest-700" : "text-muted",
                )}
              >
                <Icon className="size-[22px]" aria-hidden />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted"
            aria-expanded={moreOpen}
          >
            <Menu className="size-[22px]" aria-hidden />
            More
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="All sections">
          <button type="button" className="absolute inset-0 bg-forest-900/40" onClick={() => setMoreOpen(false)} aria-label="Close menu" />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] animate-fade-in overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-muted">{title}</p>
              <button type="button" onClick={() => setMoreOpen(false)} className="flex size-9 items-center justify-center rounded-full hover:bg-paper-2" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            {userSlot && <div className="mb-2">{userSlot}</div>}
            <div className="grid grid-cols-3 gap-2">
              {nav.map((item) => {
                const Icon = ICONS[item.icon];
                const on = active === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-medium",
                      on ? "border-forest-300 bg-forest-50 text-forest-800" : "border-line text-ink-2",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <form action={logoutAction} className="mt-3">
              <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-danger-700">
                <LogOut className="size-4" /> Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
