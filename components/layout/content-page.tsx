import type { ReactNode } from "react";

/** Simple long-form layout for About / Terms / Privacy / Help. */
export function ContentPage({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      {eyebrow && <p className="text-xs font-bold tracking-[0.14em] text-forest-600 uppercase">{eyebrow}</p>}
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      {intro && <p className="mt-4 text-lg leading-relaxed text-ink-2">{intro}</p>}
      <div className="mt-8 space-y-6 text-[15.5px] leading-relaxed text-ink-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </article>
  );
}
