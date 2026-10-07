import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import { APP_NAME, SITE_URL } from "@/lib/constants";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${APP_NAME} — Dehradun ↔ Rudraprayag shared taxi seats`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Kal ghar jaana hai? Apne route ki available seats dekho aur verified local drivers se shared taxi seat book karo. Dehradun, Rishikesh, Srinagar, Rudraprayag.",
  applicationName: APP_NAME,
  keywords: [
    "Dehradun to Rudraprayag taxi",
    "shared taxi Uttarakhand",
    "Rudraprayag to Dehradun seat",
    "Srinagar Garhwal taxi",
    "pahadi taxi booking",
  ],
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    locale: "en_IN",
    title: `${APP_NAME} — shared taxi seats across Uttarakhand`,
    description: "Verified local drivers. Real-time seat availability. Book your seat from Dehradun to Rudraprayag and back.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: APP_NAME }],
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1b4730",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
