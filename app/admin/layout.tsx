import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardShell, type NavItem } from "@/components/layout/dashboard-shell";
import { SidebarUser } from "@/components/layout/sidebar-user";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Pahadi Seat" }, robots: { index: false } };

const nav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard", mobile: true, exact: true },
  { href: "/admin/drivers", label: "Drivers", icon: "drivers", mobile: true },
  { href: "/admin/vehicles", label: "Vehicles", icon: "vehicles" },
  { href: "/admin/trips", label: "Trips", icon: "trips", mobile: true },
  { href: "/admin/bookings", label: "Bookings", icon: "bookings", mobile: true },
  { href: "/admin/users", label: "Passengers", icon: "users" },
  { href: "/admin/routes", label: "Routes", icon: "routes" },
  { href: "/admin/complaints", label: "Complaints", icon: "complaints" },
  { href: "/admin/reviews", label: "Reviews", icon: "reviews" },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <DashboardShell
      title="Admin"
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
