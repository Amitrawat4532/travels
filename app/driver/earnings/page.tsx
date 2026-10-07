import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/auth/guards";
import { getDriverContext, getDriverEarnings } from "@/server/queries/driver";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { BarChart } from "@/components/charts/bar-chart";
import { formatDate, formatPaise } from "@/lib/format";

export default function EarningsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

const MONTH = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" });

async function Content() {
  const user = await requirePageUser(["DRIVER"], "/driver/earnings");
  const driver = await getDriverContext(user.id);
  if (!driver) redirect("/driver/onboarding");
  const e = await getDriverEarnings(driver.id);

  return (
    <>
      <PageHeader title="Earnings" description="Fare from completed trips. The platform fee is paid by passengers, not deducted from you." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total earned" value={formatPaise(e.totalPaise)} hint="Completed trips" />
        <StatCard label="Collected" value={formatPaise(e.collectedPaise)} hint="Marked paid at boarding" />
        <StatCard label="To collect" value={formatPaise(e.pendingCollectionPaise)} hint="Completed, not marked paid" />
        <StatCard label="Upcoming" value={formatPaise(e.upcomingPaise)} hint={`${e.upcomingSeats} seats booked`} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Monthly earnings" description="Last 6 months" />
        <CardBody>
          <BarChart
            caption="Monthly earnings for the last 6 months"
            data={e.monthly.map((m) => ({ label: MONTH.format(new Date(`${m.month}-15T00:00:00Z`)), value: m.paise / 100, display: formatPaise(m.paise) }))}
          />
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title="By trip" />
        <CardBody>
          {e.trips.length === 0 ? (
            <p className="text-sm text-muted">Complete your first trip to see earnings here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {e.trips.map((t) => (
                <li key={t.tripId}>
                  <Link href={`/driver/trips/${t.tripId}`} className="flex items-center justify-between gap-3 py-3 hover:text-forest-700">
                    <span>
                      <span className="block font-semibold">{t.label}</span>
                      <span className="text-sm text-muted">
                        {formatDate(t.date)} · {t.seats} seats
                      </span>
                    </span>
                    <span className="font-bold tabular-nums">{formatPaise(t.fare)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
