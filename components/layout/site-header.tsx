import { Suspense } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/auth/session";
import { homeForRole } from "@/auth/guards";
import { db } from "@/server/db";
import { LinkButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { Logo } from "./brand";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-2 md:flex" aria-label="Main">
          <Link href="/search" className="hover:text-forest-700">
            Find a ride
          </Link>
          <Link href="/routes" className="hover:text-forest-700">
            Routes
          </Link>
          <Link href="/drive" className="hover:text-forest-700">
            For drivers
          </Link>
          <Link href="/help" className="hover:text-forest-700">
            Help
          </Link>
        </nav>
        <Suspense fallback={<Skeleton className="h-9 w-28 rounded-full" />}>
          <HeaderAuth />
        </Suspense>
      </div>
    </header>
  );
}

async function HeaderAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <LinkButton href="/login" variant="ghost" size="sm">
          Log in
        </LinkButton>
        <LinkButton href="/register" size="sm">
          Sign up
        </LinkButton>
      </div>
    );
  }
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  const home = homeForRole(user.role);
  return (
    <div className="flex items-center gap-1">
      <Link
        href="/notifications"
        className="relative flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] leading-4 font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
      <UserMenu name={user.name} home={home} role={user.role} />
    </div>
  );
}
