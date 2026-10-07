import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, Bookmark } from "lucide-react";
import { requirePageUser } from "@/auth/guards";
import { db } from "@/server/db";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { toggleSavedRouteAction } from "@/features/passenger/actions";
import { formatDateLong } from "@/lib/format";

export default function SavedRoutesPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requirePageUser(["PASSENGER"], "/passenger/saved-routes");
  const [saved, alerts] = await Promise.all([
    db.savedRoute.findMany({ where: { userId: user.id }, include: { from: true, to: true }, orderBy: { createdAt: "desc" } }),
    db.rideAlert.findMany({
      where: { userId: user.id, travelDate: { gte: new Date(new Date().toISOString().slice(0, 10)) } },
      include: { from: true, to: true },
      orderBy: { travelDate: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader title="Saved Routes" description="One tap to search the routes you travel often." />
      {saved.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="size-7" />}
          title="No saved routes yet"
          description="Search a route and tap “Save this route” to keep it here."
          action={<LinkButton href="/search">Search rides</LinkButton>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {saved.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
              <Link href={`/search?from=${s.from.slug}&to=${s.to.slug}`} className="group min-w-0 flex-1">
                <p className="truncate text-lg font-bold group-hover:text-forest-700">
                  {s.from.name} → {s.to.name}
                </p>
                <p className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700">
                  See rides <ArrowRight className="size-3.5" aria-hidden />
                </p>
              </Link>
              <ActionButton action={toggleSavedRouteAction} fields={{ fromSlug: s.from.slug, toSlug: s.to.slug }} variant="ghost">
                Remove
              </ActionButton>
            </li>
          ))}
        </ul>
      )}

      <Card className="mt-8">
        <CardHeader title="Ride alerts" description="We notify you when a driver lists a ride on these dates." />
        <CardBody>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted">No active alerts. When a search has no rides, tap “Notify me” to create one.</p>
          ) : (
            <ul className="divide-y divide-line">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="flex items-center gap-2">
                    <BellRing className="size-4 text-forest-600" aria-hidden />
                    <span className="font-semibold">
                      {a.from.name} → {a.to.name}
                    </span>
                    <span className="text-muted">· {formatDateLong(a.travelDate)}</span>
                  </span>
                  <span className="text-xs text-muted">{a.notifiedAt ? "Ride found ✓" : "Waiting"}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
