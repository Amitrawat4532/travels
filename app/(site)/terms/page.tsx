import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { LATE_CANCELLATION_REFUND_PERCENT, PLATFORM_FEE_PER_SEAT_PAISE } from "@/lib/constants";

export const metadata: Metadata = { title: "Terms of use", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <ContentPage eyebrow="Legal" title="Terms of use" intro="Plain-language terms. Please read them before booking or listing a ride.">
      <h2>1. What Pahadi Seat does</h2>
      <p>Pahadi Seat is a platform that connects passengers with independent, verified drivers who are already travelling on a route. The ride itself is provided by the driver.</p>
      <h2>2. Bookings & payment</h2>
      <ul>
        <li>A booking reserves specific seats on a specific trip. Seats cannot be booked beyond the vehicle&apos;s listed capacity.</li>
        <li>A platform fee of ₹{PLATFORM_FEE_PER_SEAT_PAISE / 100} per seat is added to the fare and shown before you confirm.</li>
        <li>In pay-at-boarding mode you pay the driver directly in cash or UPI when you board.</li>
      </ul>
      <h2>3. Cancellations</h2>
      <ul>
        <li>Each trip shows its free-cancellation window. Cancelling within it gives a full refund of any online payment.</li>
        <li>After the window, {LATE_CANCELLATION_REFUND_PERCENT}% of the fare is refunded for online payments.</li>
        <li>If a driver or Pahadi Seat cancels a trip, you receive a full refund.</li>
      </ul>
      <h2>4. Drivers</h2>
      <ul>
        <li>Drivers must hold a valid licence, vehicle RC, insurance and commercial permit, and keep them up to date.</li>
        <li>Drivers may not publish rides until verified and must honour confirmed bookings.</li>
        <li>Repeated cancellations, unsafe driving or overcharging can lead to suspension.</li>
      </ul>
      <h2>5. Conduct</h2>
      <p>Be respectful. Report any safety problem to us immediately. We may suspend accounts that misuse the platform.</p>
      <p className="text-sm text-muted">These terms are a template for the MVP and must be reviewed by a lawyer before public launch.</p>
    </ContentPage>
  );
}
