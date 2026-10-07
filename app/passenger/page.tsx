import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, CalendarCheck, MapPin, Phone, Search, Ticket, Wallet } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { getPassengerBookings, getPassengerStats } from "@/server/queries/bookings";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { EmptyState, PageHeader, StatCard, Avatar } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { BookingList } from "@/features/booking/booking-list";
import { formatDateLong, formatPaise, formatTime, relativeDayLabel } from "@/lib/format";
import { telLink } from "@/lib/utils";

export default function PassengerDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requirePageUser(["PASSENGER"], "/passenger");
  const [upcoming, past, stats] = await Promise.all([
    getPassengerBookings(user.id, "upcoming"),
    getPassengerBookings(user.id, "past"),
    getPassengerStats(user.id),
  ]);
  const next = upcoming[0];
  const now = new Date();

  return (
    <>
      <PageHeader
        title={`Namaste, ${user.name.split(" ")[0]} 🙏`}
        description="Aapki agli yatra aur bookings ek jagah."
        action={
          <LinkButton href="/search">
            <Search className="size-4" aria-hidden /> Book a ride
          </LinkButton>
        }
      />

      {next ? (
        <section aria-labelledby="next-trip" className="overflow-hidden rounded-3xl bg-forest-800 text-white shadow-lift">
          <div className="p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <p id="next-trip" className="text-xs font-bold tracking-[0.14em] text-marigold-400 uppercase">
                Next trip · {relativeDayLabel(next.boardingStop.scheduledAt, now)}
              </p>
              <StatusBadge status={next.status} className="bg-white/10 text-white ring-white/20" />
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {next.boardingStop.location.name} → {next.dropStop.location.name}
            </p>
            <p className="mt-1 text-forest-100">
              {formatDateLong(next.boardingStop.scheduledAt)} · <strong className="text-white">{formatTime(next.boardingStop.scheduledAt)}</strong>
            </p>
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10">
                <p className="flex items-center gap-1.5 text-forest-200">
                  <MapPin className="size-3.5" aria-hidden /> Boarding
                </p>
                <p className="mt-0.5 font-semibold">{next.boardingStop.pointName}</p>
              </div>
              <div className="rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10">
                <p className="flex items-center gap-1.5 text-forest-200">
                  <Ticket className="size-3.5" aria-hidden /> Seat
                </p>
                <p className="mt-0.5 font-semibold">
                  {next.seatNumbers.join(", ")} · {next.code}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10">
                <Avatar name={next.trip.driver.user.name} size={36} className="ring-0" />
                <div className="min-w-0">
                  <p className="text-forest-200">Driver</p>
                  <p className="truncate font-semibold">{next.trip.driver.user.name}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-white/10 bg-forest-900/40 px-5 py-3 sm:px-7">
            <LinkButton href={`/passenger/bookings/${next.id}`} variant="accent" size="sm">
              View booking <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
            {next.status === "CONFIRMED" && (
              <a
                href={telLink(next.trip.driver.user.phone)}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/20"
              >
                <Phone className="size-4" aria-hidden /> Call driver
              </a>
            )}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={<Ticket className="size-7" />}
          title="Aapki abhi koi booking nahi hai."
          description="Kal ghar jaana hai? Apne route ki available seats dekho aur seat book karo."
          action={<LinkButton href="/search">Search rides</LinkButton>}
        />
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Upcoming" value={stats.upcoming} icon={<CalendarCheck className="size-4" />} />
        <StatCard label="Trips completed" value={stats.completed} icon={<Ticket className="size-4" />} />
        <StatCard label="Total spent" value={formatPaise(stats.spentPaise)} icon={<Wallet className="size-4" />} />
        <StatCard label="Saved routes" value={stats.saved} icon={<Bookmark className="size-4" />} />
      </div>

      {upcoming.length > 1 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">More upcoming trips</h2>
          <BookingList bookings={upcoming.slice(1, 4)} />
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Past bookings</h2>
          <Link href="/passenger/past" className="text-sm font-semibold text-forest-700 hover:underline">
            View all
          </Link>
        </div>
        {past.length ? (
          <BookingList bookings={past.slice(0, 4)} />
        ) : (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">Your completed trips will appear here.</p>
        )}
      </section>
    </>
  );
}
