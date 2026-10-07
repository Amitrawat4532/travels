import { Suspense } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, IndianRupee, ShieldCheck, Ticket, Users, UserRound } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { getAdminOverview, getBusinessMetrics, getDailySeries, getPopularRoutes } from "@/server/queries/admin";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { BarChart, RankBars } from "@/components/charts/bar-chart";
import { formatPaise } from "@/lib/format";

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

const DAY = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLabel = (d: string) => DAY.format(new Date(`${d}T00:00:00Z`));

async function Content() {
  await requirePageUser(["ADMIN"], "/admin");
  const [o, series, routes, m] = await Promise.all([getAdminOverview(), getDailySeries(30), getPopularRoutes(), getBusinessMetrics()]);
  const funnelMax = Math.max(1, m.funnel[0]?.value ?? 1);

  return (
    <>
      <PageHeader title="Overview" description="Is the business working? Live numbers from bookings, trips and drivers." />

      {(o.pendingDrivers > 0 || o.pendingVehicles > 0 || o.openComplaints > 0) && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {o.pendingDrivers > 0 && (
            <Link href="/admin/drivers?status=PENDING" className="flex items-center justify-between rounded-2xl border border-marigold-100 bg-marigold-50 p-4 text-marigold-700 hover:border-marigold-400">
              <span className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="size-5" aria-hidden /> {o.pendingDrivers} driver(s) to verify
              </span>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
          {o.pendingVehicles > 0 && (
            <Link href="/admin/vehicles?status=PENDING" className="flex items-center justify-between rounded-2xl border border-marigold-100 bg-marigold-50 p-4 text-marigold-700 hover:border-marigold-400">
              <span className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-5" aria-hidden /> {o.pendingVehicles} vehicle(s) to approve
              </span>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
          {o.openComplaints > 0 && (
            <Link href="/admin/complaints" className="flex items-center justify-between rounded-2xl border border-danger-500/20 bg-danger-50 p-4 text-danger-700 hover:border-danger-500/50">
              <span className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-5" aria-hidden /> {o.openComplaints} open complaint(s)
              </span>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total users" value={o.users} hint={`${o.passengers} passengers`} icon={<Users className="size-4" />} />
        <StatCard label="Total drivers" value={o.drivers} icon={<UserRound className="size-4" />} />
        <StatCard label="Verified drivers" value={o.verifiedDrivers} hint={`${o.pendingDrivers} pending`} icon={<ShieldCheck className="size-4" />} />
        <StatCard label="Active trips" value={o.activeTrips} icon={<CalendarClock className="size-4" />} />
        <StatCard label="Total bookings" value={o.totalBookings} icon={<Ticket className="size-4" />} />
        <StatCard label="Completed trips" value={o.completedTrips} icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Platform revenue" value={formatPaise(o.platformRevenuePaise)} hint="Fees on confirmed + completed" icon={<IndianRupee className="size-4" />} />
        <StatCard label="Gross booking value" value={formatPaise(o.gmvPaise)} icon={<IndianRupee className="size-4" />} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Bookings over time" description="Bookings created per day, last 30 days" />
          <CardBody>
            <BarChart caption="Bookings per day, last 30 days" data={series.map((d) => ({ label: dayLabel(d.day), value: d.bookings }))} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Revenue over time" description="Platform fees per day, last 30 days" />
          <CardBody>
            <BarChart
              caption="Platform revenue per day, last 30 days"
              data={series.map((d) => ({ label: dayLabel(d.day), value: d.revenuePaise, display: formatPaise(d.revenuePaise) }))}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Popular routes" description="Confirmed + completed bookings" />
          <CardBody>
            {routes.length ? <RankBars data={routes.map((r) => ({ label: r.label, value: r.bookings, display: `${r.bookings} bookings · ${r.seats} seats` }))} /> : <p className="text-sm text-muted">No bookings yet.</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Booking conversion" description={`Last 30 days · ${m.conversionPct}% of searches end in a booking`} />
          <CardBody>
            <ul className="space-y-3">
              {m.funnel.map((f, i) => (
                <li key={f.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{f.label}</span>
                    <span className="font-semibold text-ink-2 tabular-nums">
                      {f.value}
                      {i > 0 && m.funnel[i - 1]!.value > 0 && (
                        <span className="ml-1.5 font-normal text-muted">({Math.round((f.value / m.funnel[i - 1]!.value) * 100)}%)</span>
                      )}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-r-[4px] bg-paper-2">
                    <div className="h-full rounded-r-[4px] bg-forest-500" style={{ width: `${(f.value / funnelMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">
              Active drivers (30d): <strong className="text-ink">{m.activeDrivers}</strong> · Active passengers (30d):{" "}
              <strong className="text-ink">{m.activePassengers}</strong>
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
