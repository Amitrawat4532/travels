import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";
import { BOOKING_CUTOFF_MINUTES, LATE_CANCELLATION_REFUND_PERCENT } from "@/lib/constants";

export const metadata: Metadata = { title: "Help & FAQ", description: "How booking, payment, cancellation and driver verification work on Pahadi Seat.", alternates: { canonical: "/help" } };

const faqs: { q: string; a: React.ReactNode }[] = [
  { q: "Seat book kaise karein?", a: <>Search your route and date, open a ride, tap the seats you want, add passenger names and tap <strong>Confirm Booking</strong>. You get a Booking ID and the driver&apos;s number instantly.</> },
  { q: "Payment kaise hoga?", a: "Right now you pay the driver at boarding — cash or UPI. Your seat is reserved the moment you book. Online payment is coming soon." },
  { q: "Can I get down before the destination?", a: "Yes. Choose your drop point (e.g. Srinagar or Devprayag) while booking. You pay only for your part of the route, and the driver sees exactly where you get down." },
  { q: "How do I cancel?", a: <>Open <Link href="/passenger/bookings" className="font-semibold text-forest-700 underline">My Bookings</Link>, choose the booking and tap Cancel Booking. Seats go back to other passengers. Online payments are refunded in full inside the free-cancellation window, {LATE_CANCELLATION_REFUND_PERCENT}% after.</> },
  { q: "Until when can I book?", a: `Booking closes ${BOOKING_CUTOFF_MINUTES} minutes before departure.` },
  { q: "What if the driver cancels?", a: "You get a notification immediately, a full refund of any online payment, and you can book another ride on the same route." },
  { q: "How are drivers verified?", a: "Our team checks the driving licence, vehicle RC, insurance and taxi permit, and the driver's photo. Only verified drivers can publish rides and they show a ✓ Verified Driver badge." },
  { q: "I'm a driver. How do I start?", a: <>Create a driver account, upload your documents and vehicle details, and once approved list your next trip. <Link href="/drive" className="font-semibold text-forest-700 underline">Learn more</Link>.</> },
];

export default function HelpPage() {
  return (
    <ContentPage eyebrow="Help" title="Help & FAQ" intro="Short answers to the questions we hear most.">
      <div className="space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-line bg-white p-5 shadow-card">
            <summary className="cursor-pointer list-none font-semibold text-ink after:float-right after:text-muted after:content-['+'] group-open:after:content-['–']">{f.q}</summary>
            <div className="mt-2 text-ink-2">{f.a}</div>
          </details>
        ))}
      </div>
      <p>
        Still stuck? <Link href="/contact" className="font-semibold text-forest-700 underline">Contact support</Link>.
      </p>
    </ContentPage>
  );
}
