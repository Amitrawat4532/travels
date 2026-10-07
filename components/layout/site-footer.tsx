import Link from "next/link";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP } from "@/lib/constants";
import { Logo } from "./brand";

const columns = [
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Help & FAQ", "/help"],
    ],
  },
  {
    title: "Travel",
    links: [
      ["Find a ride", "/search"],
      ["Popular routes", "/routes"],
      ["Dehradun → Rudraprayag", "/routes/dehradun-to-rudraprayag"],
      ["Rudraprayag → Dehradun", "/routes/rudraprayag-to-dehradun"],
    ],
  },
  {
    title: "Drivers",
    links: [
      ["Become a driver", "/drive"],
      ["Driver registration", "/register?role=driver"],
      ["Driver login", "/login?next=/driver"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Terms", "/terms"],
      ["Privacy", "/privacy"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-forest-900 text-forest-100">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-forest-200">
              Pahad ke apne drivers, apne raste. Seat-by-seat booking for shared taxis across Uttarakhand.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li>
                <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 hover:text-white">
                  <Phone className="size-4" aria-hidden /> {SUPPORT_PHONE}
                </a>
              </li>
              <li>
                <a href={`https://wa.me/${SUPPORT_WHATSAPP}`} className="inline-flex items-center gap-2 hover:text-white" rel="noopener noreferrer" target="_blank">
                  <MessageCircle className="size-4" aria-hidden /> WhatsApp support
                </a>
              </li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 hover:text-white">
                  <Mail className="size-4" aria-hidden /> {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <h2 className="text-xs font-semibold tracking-wider text-forest-300 uppercase">{col.title}</h2>
                <ul className="mt-3 space-y-2.5 text-sm">
                  {col.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className="text-forest-100 hover:text-white">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-forest-800 pt-6 text-xs text-forest-300 sm:flex-row sm:justify-between">
          <p>© Pahadi Seat · Made in Uttarakhand</p>
          <p>Dehradun · Rishikesh · Srinagar · Rudraprayag</p>
        </div>
      </div>
    </footer>
  );
}
