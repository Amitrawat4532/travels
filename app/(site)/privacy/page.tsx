import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <ContentPage eyebrow="Legal" title="Privacy policy" intro="We collect only what is needed to get you home safely.">
      <h2>What we collect</h2>
      <ul>
        <li>Name, mobile number and email to create your account.</li>
        <li>Booking details: route, seats, boarding and drop points, co-passenger names.</li>
        <li>For drivers: licence, vehicle RC, insurance and permit documents, and vehicle photos.</li>
        <li>Basic usage events (searches, ride views) to improve routes and availability.</li>
      </ul>
      <h2>Who sees it</h2>
      <ul>
        <li>Your driver sees your name, phone, seats and drop point — only for trips you booked with them.</li>
        <li>Passengers see a driver&apos;s name, photo, rating and vehicle. The driver&apos;s phone is shown only after a confirmed booking.</li>
        <li>Verification documents are visible only to the driver and our verification team. They are never public.</li>
      </ul>
      <h2>Security</h2>
      <p>Passwords are hashed, sessions are stored securely, and documents are served only to authorised users.</p>
      <h2>Your choices</h2>
      <p>You can update your profile any time and ask us to delete your account by writing to support.</p>
    </ContentPage>
  );
}
