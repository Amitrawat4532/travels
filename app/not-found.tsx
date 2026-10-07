import Link from "next/link";
import { MountainArt, Logo } from "@/components/layout/brand";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 text-center">
      <MountainArt className="pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full" />
      <div className="relative">
        <Logo className="justify-center" />
        <p className="mt-10 text-7xl font-extrabold text-forest-200">404</p>
        <h1 className="mt-2 text-2xl font-extrabold">Yeh raasta nahi mila</h1>
        <p className="mt-2 text-muted">The page you are looking for doesn&apos;t exist or has moved.</p>
        <div className="mt-6 flex justify-center gap-3">
          <LinkButton href="/">Go home</LinkButton>
          <LinkButton href="/search" variant="outline">Find a ride</LinkButton>
        </div>
        <p className="mt-6 text-sm text-muted">
          Need help? <Link href="/contact" className="font-semibold text-forest-700 underline">Contact us</Link>
        </p>
      </div>
    </div>
  );
}
