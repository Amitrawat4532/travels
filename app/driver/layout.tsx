import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";
import { SidebarUser } from "@/components/layout/sidebar-user";

export const metadata: Metadata = { title: { default: "Driver dashboard", template: "%s · Driver · Pahadi Seat" }, robots: { index: false } };

const nav: NavItem[] = [
  { href: "/driver", label: "Dashboard", icon: "dashboard", mobile: true, exact: true },
  { href: "/driver/trips", label: "My Trips", icon: "trips", mobile: true },
  { href: "/driver/trips/new", label: "Create Trip", icon: "create", mobile: true },
  { href: "/driver/bookings", label: "Bookings", icon: "bookings", mobile: true },
  { href: "/driver/passengers", label: "Passengers", icon: "passengers" },
  { href: "/driver/earnings", label: "Earnings", icon: "earnings" },
  { href: "/driver/vehicles", label: "Vehicle", icon: "vehicle" },
  { href: "/driver/profile", label: "Profile", icon: "profile" },
  { href: "/driver/settings", label: "Settings", icon: "settings" },
];

export default function DriverLayout({ children }: LayoutProps<"/driver">) {
  return (
    <DashboardShell
      title="Driver"
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
