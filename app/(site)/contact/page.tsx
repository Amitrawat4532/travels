import type { Metadata } from "next";
import { Mail, MessageCircle, Phone, MapPin } from "lucide-react";
import { ContentPage } from "@/components/layout/content-page";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP } from "@/lib/constants";

export const metadata: Metadata = { title: "Contact", description: "Call, WhatsApp or email Pahadi Seat support.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  const items = [
    { icon: Phone, label: "Call us (7 AM – 10 PM)", value: SUPPORT_PHONE, href: `tel:${SUPPORT_PHONE.replace(/\s/g, "")}` },
    { icon: MessageCircle, label: "WhatsApp", value: "Chat with support", href: `https://wa.me/${SUPPORT_WHATSAPP}` },
    { icon: Mail, label: "Email", value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  ];
  return (
    <ContentPage eyebrow="Contact" title="Hum se baat karo" intro="Booking problem, driver question, or want to list your route? We reply fast.">
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((i) => (
          <li key={i.label}>
            <a href={i.href} className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-white p-5 shadow-card hover:border-forest-300">
              <i.icon className="size-6 text-forest-600" aria-hidden />
              <span className="text-sm text-muted">{i.label}</span>
              <span className="font-semibold text-ink">{i.value}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2">
        <MapPin className="size-4 text-forest-600" aria-hidden /> Office: Rajpur Road, Dehradun, Uttarakhand
      </p>
      <p>Logged-in users can also report an issue from any booking page — it reaches our team directly with the booking details.</p>
    </ContentPage>
  );
}
