import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CalendarClock, IndianRupee, Percent, PlusCircle, Ticket, Users } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { getDriverContext, getDriverStats, getDriverTrips } from "@/server/queries/driver";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { Alert, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { DriverStatusBanner, DriverTripCardView, VerifiedPill } from "@/features/driver/components";
import { formatPaise } from "@/lib/format";

export default function DriverDashboardPage(props: PageProps<"/driver">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/driver">["searchParams"] }) {
  const user = await requirePageUser(["DRIVER"], "/driver");
  const sp = await searchParams;
  const driver = await getDriverContext(user.id);
  if (!driver) redirect("/driver/onboarding");
  const [stats, upcoming] = await Promise.all([getDriverStats(driver.id), getDriverTrips(driver.id, "upcoming")]);
  const canPublish = driver.status === "VERIFIED" && driver.vehicles.some((v) => v.status === "APPROVED" && v.isActive);

  return (
    <>
      <PageHeader
        title={`Namaste, ${user.name.split(" ")[0]} ji`}
        description={driver.status === "VERIFIED" ? <VerifiedPill /> : "Let's get you on the road."}
        action={
          canPublish ? (
            <LinkButton href="/driver/trips/new" size="lg">
              <PlusCircle className="size-5" aria-hidden /> Create Trip
            </LinkButton>
          ) : null
        }
      />
      {sp.submitted === "1" && (
        <Alert tone="success" title="Documents submitted 🙏" className="mb-6">
          We&apos;ll review your licence and vehicle documents and notify you here.
        </Alert>
      )}
      <DriverStatusBanner status={driver.status} reason={driver.rejectionReason} />
      {driver.status === "VERIFIED" && !canPublish && (
        <Alert tone="warning" className="mb-6" title="No approved vehicle">
          Add a vehicle (or wait for its approval) before creating trips.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Upcoming trips" value={stats.upcoming} icon={<CalendarClock className="size-4" />} />
        <StatCard label="Total passengers" value={stats.passengers} icon={<Users className="size-4" />} />
        <StatCard label="Seats sold" value={stats.seatsSold} icon={<Ticket className="size-4" />} />
        <StatCard label="Total earnings" value={formatPaise(stats.earningsPaise)} hint="Completed trips" icon={<IndianRupee className="size-4" />} />
        <StatCard label="Cancellation rate" value={`${stats.cancellationRate}%`} hint={`${stats.totalTrips} trips total`} icon={<Percent className="size-4" />} className="col-span-2 sm:col-span-1" />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Upcoming trips</h2>
        {upcoming.length ? (
          <div className="space-y-4">
            {upcoming.map((t) => (
              <DriverTripCardView key={t.id} trip={t} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarClock className="size-7" />}
            title="Apni next journey list karein aur khaali seats fill karein."
            description="Going to Dehradun or back home tomorrow? Publish the trip and passengers on your route can book seats."
            action={canPublish ? <LinkButton href="/driver/trips/new">Create Trip</LinkButton> : undefined}
          />
        )}
      </section>
    </>
  );
}
