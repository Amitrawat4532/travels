import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Bell, CheckCheck } from "lucide-react";
import { requirePageUser, homeForRole } from "@/auth/guards";
import { db } from "@/server/db";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { ActionButton } from "@/components/ui/action-button";
import { markNotificationsReadAction } from "@/features/passenger/actions";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const user = await requirePageUser(undefined, "/notifications");
  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const unread = items.filter((n) => !n.readAt).length;
  const now = new Date();

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <Link href={homeForRole(user.role)} className="text-sm font-medium text-muted hover:text-ink">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted">{unread ? `${unread} unread` : "You're all caught up"}</p>
        </div>
        {unread > 0 && (
          <ActionButton action={markNotificationsReadAction}>
            <CheckCheck className="size-4" aria-hidden /> Mark all read
          </ActionButton>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Bell className="size-7" />} title="No notifications yet" description="Booking updates and trip reminders will appear here." />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          {items.map((n) => {
            const body = (
              <div className="flex gap-3 px-4 py-3.5">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-forest-500")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[15px]", n.readAt ? "font-medium text-ink-2" : "font-bold text-ink")}>{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{timeAgo(n.createdAt, now)}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id} className="border-b border-line last:border-0">
                {n.link ? (
                  <Link href={n.link} className="block hover:bg-paper">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
