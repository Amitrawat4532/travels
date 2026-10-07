import type { ReactNode } from "react";
import { MountainArt } from "@/components/layout/brand";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <MountainArt className="pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full" />
      <div className="relative mx-auto max-w-md px-4 py-10 sm:py-16">
        <div className="rounded-3xl border border-line bg-white p-6 shadow-lift sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
