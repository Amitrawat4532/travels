import { Suspense } from "react";
import Link from "next/link";
import { requirePageUser } from "@/auth/guards";
import { db } from "@/server/db";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { PageHeader, Stars } from "@/components/ui/misc";
import { Table, Th, Td, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/ui/action-button";
import { toggleReviewAction } from "@/features/admin/actions";
import { formatDate } from "@/lib/format";

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requirePageUser(["ADMIN"], "/admin/reviews");
  const reviews = await db.review.findMany({
    include: {
      user: { select: { name: true } },
      driver: { select: { id: true, user: { select: { name: true } } } },
      booking: { select: { code: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader title="Ratings & reviews" description="Only passengers with a completed trip can review. Hide abusive or fake reviews." />
      <Table minWidth={860}>
        <thead>
          <tr>
            <Th>Driver</Th>
            <Th>Rating</Th>
            <Th>Review</Th>
            <Th>Passenger</Th>
            <Th>Date</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {reviews.length === 0 && <EmptyRow colSpan={6}>No reviews yet.</EmptyRow>}
          {reviews.map((r) => (
            <tr key={r.id} className={r.isHidden ? "opacity-60" : undefined}>
              <Td>
                <Link href={`/admin/drivers/${r.driver.id}`} className="font-semibold text-forest-700 hover:underline">
                  {r.driver.user.name}
                </Link>
              </Td>
              <Td>
                <Stars value={r.rating} size={14} />
              </Td>
              <Td className="max-w-sm">
                {r.comment ?? <span className="text-muted">—</span>}
                {r.isHidden && <Badge tone="red" className="ml-2">Hidden</Badge>}
              </Td>
              <Td>
                {r.user.name}
                <span className="block font-mono text-xs text-muted">{r.booking.code}</span>
              </Td>
              <Td className="whitespace-nowrap">{formatDate(r.createdAt)}</Td>
              <Td className="text-right">
                <ActionButton action={toggleReviewAction} fields={{ id: r.id }} variant="ghost">
                  {r.isHidden ? "Restore" : "Hide"}
                </ActionButton>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
