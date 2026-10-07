import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";
import { SidebarUser } from "@/components/layout/sidebar-user";

export const metadata: Metadata = { title: { default: "My trips", template: "%s · Pahadi Seat" }, robots: { index: false } };

const nav: NavItem[] = [
  { href: "/passenger", label: "Dashboard", icon: "dashboard", mobile: true, exact: true },
  { href: "/passenger/bookings", label: "My Bookings", icon: "bookings", mobile: true },
  { href: "/passenger/upcoming", label: "Upcoming Trips", icon: "upcoming" },
  { href: "/passenger/past", label: "Past Trips", icon: "past" },
  { href: "/search", label: "Book a ride", icon: "create", mobile: true },
  { href: "/passenger/saved-routes", label: "Saved Routes", icon: "saved" },
  { href: "/notifications", label: "Notifications", icon: "notifications", mobile: true },
  { href: "/passenger/profile", label: "Profile", icon: "profile" },
  { href: "/passenger/settings", label: "Settings", icon: "settings" },
];

export default function PassengerLayout({ children }: LayoutProps<"/passenger">) {
  return (
    <DashboardShell
      title="Passenger"
      nav={nav}
      userSlot={
        <Suspense fallback={null}>
          <SidebarUser />
        </Suspense>
      }
    >
      {children}
    </DashboardShell>
  );
}
