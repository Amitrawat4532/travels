import Link from "next/link";
import { cn } from "@/lib/utils";

export function FilterTabs({ items, label }: { items: { label: string; href: string; active: boolean; count?: number }[]; label: string }) {
  return (
    <nav className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label={label}>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
            i.active ? "border-forest-700 bg-forest-700 text-white" : "border-line bg-white text-ink-2 hover:border-forest-300",
          )}
        >
          {i.label}
          {i.count !== undefined && <span className={cn("ml-1.5 tabular-nums", i.active ? "text-forest-200" : "text-muted")}>{i.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
