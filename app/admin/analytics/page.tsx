import { Suspense } from "react";
import { requirePageUser } from "@/auth/guards";
import { getBusinessMetrics, getDailySeries, getPopularRoutes, getAdminOverview } from "@/server/queries/admin";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { BarChart, RankBars } from "@/components/charts/bar-chart";
import { formatPaise } from "@/lib/format";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

const DAY = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

async function Content() {
  await requirePageUser(["ADMIN"], "/admin/analytics");
  const [m, series, routes, o] = await Promise.all([getBusinessMetrics(), getDailySeries(30), getPopularRoutes(), getAdminOverview()]);

  return (
    <>
      <PageHeader title="Business analytics" description="The numbers that tell us whether the marketplace is working. Last 30 days unless noted." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Searches" value={m.funnel[0]!.value} />
        <StatCard label="Ride views" value={m.funnel[1]!.value} />
        <StatCard label="Booking attempts" value={m.funnel[2]!.value} />
        <StatCard label="Successful bookings" value={m.funnel[3]!.value} hint={`${m.conversionPct}% search → booking`} />
        <StatCard label="Cancelled bookings" value={m.cancels} />
        <StatCard label="Revenue (all time)" value={formatPaise(o.platformRevenuePaise)} hint="Platform fees" />
        <StatCard label="Active drivers" value={m.activeDrivers} hint="Listed a trip" />
        <StatCard label="Active passengers" value={m.activePassengers} hint="Made a booking" />
        <StatCard label="Avg seats sold / trip" value={m.avgSeatsPerTrip} hint={`Avg vehicle: ${m.avgVehicleSeats} seats`} />
        <StatCard label="Avg booking value" value={formatPaise(m.avgBookingValuePaise)} />
        <StatCard label="Driver utilisation" value={`${m.utilisationPct}%`} hint="Seats sold ÷ seats offered" />
        <StatCard label="Gross booking value" value={formatPaise(o.gmvPaise)} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Bookings per day" />
          <CardBody>
            <BarChart caption="Bookings per day" data={series.map((d) => ({ label: DAY.format(new Date(`${d.day}T00:00:00Z`)), value: d.bookings }))} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Popular routes" />
          <CardBody>
            <RankBars data={routes.map((r) => ({ label: r.label, value: r.seats, display: `${r.seats} seats` }))} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
