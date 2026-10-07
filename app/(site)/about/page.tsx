import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About us",
  description: "Pahadi Seat connects passengers with verified local shared-taxi drivers across Garhwal, starting with Dehradun ↔ Rudraprayag.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ContentPage eyebrow="About" title="Pahad ke raste, pahad ke log" intro="We started Pahadi Seat because finding a seat home shouldn't need ten phone calls and three WhatsApp groups.">
      <p>
        Every day hundreds of Bolero, Sumo and Tempo Traveller drivers drive between Dehradun, Rishikesh, Srinagar and
        Rudraprayag — often with empty seats. At the same time students, families and working people are calling around asking
        &ldquo;kal koi gaadi ja rahi hai?&rdquo;
      </p>
      <p>
        Pahadi Seat puts both sides on one simple screen. Drivers list a trip only when they are actually travelling. Passengers
        see the departure time, boarding point, seats left and the driver&apos;s verified profile — and book a seat in a minute.
      </p>
      <h2>What we believe</h2>
      <ul>
        <li>Local drivers know these roads best. We help them earn more from trips they already make.</li>
        <li>Trust comes from verification and honest reviews, not marketing.</li>
        <li>The app must work for everyone — big text, simple steps, works on any phone.</li>
      </ul>
      <h2>Where we are</h2>
      <p>We are live on Dehradun ↔ Rudraprayag and Dehradun ↔ Srinagar. Kedarnath valley, Chamoli and Tehri routes are next.</p>
      <div className="flex flex-wrap gap-3 pt-2">
        <LinkButton href="/search">Find a ride</LinkButton>
        <LinkButton href="/drive" variant="outline">Drive with us</LinkButton>
      </div>
    </ContentPage>
  );
}
