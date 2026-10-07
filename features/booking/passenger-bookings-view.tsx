import Link from "next/link";
import { Ticket } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { getPassengerBookings } from "@/server/queries/bookings";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookingList } from "./booking-list";

const TABS = [
  { scope: "all", href: "/passenger/bookings", label: "All" },
  { scope: "upcoming", href: "/passenger/upcoming", label: "Upcoming" },
  { scope: "past", href: "/passenger/past", label: "Past" },
] as const;

export async function PassengerBookingsView({ scope }: { scope: "all" | "upcoming" | "past" }) {
  const tab = TABS.find((t) => t.scope === scope)!;
  const user = await requirePageUser(["PASSENGER"], tab.href);
  const bookings = await getPassengerBookings(user.id, scope);
  const titles = { all: "My Bookings", upcoming: "Upcoming Trips", past: "Past Trips" };

  return (
    <>
      <PageHeader title={titles[scope]} description="Tap a booking to see ticket details, contact the driver or cancel." />
      <nav className="mb-5 flex gap-1 rounded-xl bg-paper-2 p-1" aria-label="Booking filters">
        {TABS.map((t) => (
          <Link
            key={t.scope}
            href={t.href}
            aria-current={t.scope === scope ? "page" : undefined}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold",
              t.scope === scope ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {bookings.length ? (
        <BookingList bookings={bookings} />
      ) : (
        <EmptyState
          icon={<Ticket className="size-7" />}
          title="Aapki abhi koi booking nahi hai."
          description={scope === "past" ? "Completed and cancelled trips will show up here." : "Find a ride on your route and book a seat in a minute."}
          action={<LinkButton href="/search">Search rides</LinkButton>}
        />
      )}
    </>
  );
}
