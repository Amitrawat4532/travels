"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, Ticket, User } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { logoutAction } from "@/features/auth/actions";

export function UserMenu({ name, home, role }: { name: string; home: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-paper-2"
      >
        <Avatar name={name} size={34} />
        <span className="hidden max-w-28 truncate text-sm font-semibold sm:block">{name.split(" ")[0]}</span>
        <ChevronDown className="size-4 text-muted" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 animate-fade-in overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lift"
        >
          <div className="border-b border-line px-4 py-2.5">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted capitalize">{role.toLowerCase()}</p>
          </div>
          <Link role="menuitem" href={home} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-paper-2">
            <LayoutDashboard className="size-4 text-muted" /> Dashboard
          </Link>
          {role === "PASSENGER" && (
            <Link role="menuitem" href="/passenger/bookings" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-paper-2">
              <Ticket className="size-4 text-muted" /> My bookings
            </Link>
          )}
          <Link role="menuitem" href={`${home}/profile`} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-paper-2">
            <User className="size-4 text-muted" /> Profile
          </Link>
          <form action={logoutAction}>
            <button role="menuitem" type="submit" className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-danger-700 hover:bg-danger-50">
              <LogOut className="size-4" /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
