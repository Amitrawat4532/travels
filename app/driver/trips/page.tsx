import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, PlusCircle } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { getDriverContext, getDriverTrips } from "@/server/queries/driver";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { DriverTripCardView } from "@/features/driver/components";
import { cn } from "@/lib/utils";

export default function DriverTripsPage(props: PageProps<"/driver/trips">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/driver/trips">["searchParams"] }) {
  const user = await requirePageUser(["DRIVER"], "/driver/trips");
  const driver = await getDriverContext(user.id);
  if (!driver) redirect("/driver/onboarding");
  const sp = await searchParams;
  const scope = sp.tab === "past" ? "past" : "upcoming";
  const trips = await getDriverTrips(driver.id, scope);

  return (
    <>
      <PageHeader
        title="My Trips"
        description="Every trip is separate — list one whenever you are actually travelling."
        action={
          driver.status === "VERIFIED" ? (
            <LinkButton href="/driver/trips/new">
              <PlusCircle className="size-4" aria-hidden /> Create Trip
            </LinkButton>
          ) : null
        }
      />
      <nav className="mb-5 flex gap-1 rounded-xl bg-paper-2 p-1 sm:max-w-xs" aria-label="Trip filters">
        {(["upcoming", "past"] as const).map((t) => (
          <Link
            key={t}
            href={t === "upcoming" ? "/driver/trips" : "/driver/trips?tab=past"}
            aria-current={scope === t ? "page" : undefined}
            className={cn("flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold capitalize", scope === t ? "bg-white shadow-sm" : "text-muted")}
          >
            {t === "past" ? "Previous trips" : "Upcoming"}
          </Link>
        ))}
      </nav>
      {trips.length ? (
        <div className="space-y-4">
          {trips.map((t) => (
            <DriverTripCardView key={t.id} trip={t} showPassengers={scope === "upcoming"} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarClock className="size-7" />}
          title={scope === "upcoming" ? "Apni next journey list karein aur khaali seats fill karein." : "No previous trips yet"}
          action={scope === "upcoming" && driver.status === "VERIFIED" ? <LinkButton href="/driver/trips/new">Create Trip</LinkButton> : undefined}
        />
      )}
    </>
  );
}
