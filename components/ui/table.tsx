import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Horizontally scrollable table that stays usable at 320px. */
export function Table({ children, minWidth = 720, className }: { children: ReactNode; minWidth?: number; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-line bg-white shadow-card", className)}>
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn("border-b border-line bg-paper px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-muted uppercase", className)} {...props} />;
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("border-b border-line px-4 py-3 align-top last:border-0", className)} {...props} />;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}
