import { Suspense } from "react";
import type { Role } from "@prisma/client";
import { requirePageUser } from "@/auth/guards";
import { db } from "@/server/db";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { PageHeader } from "@/components/ui/misc";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { Table, Th, Td, EmptyRow } from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { userStatusAction } from "@/features/admin/actions";
import { formatDate } from "@/lib/format";

export default function AdminUsersPage(props: PageProps<"/admin/users">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/users">["searchParams"] }) {
  const admin = await requirePageUser(["ADMIN"], "/admin/users");
  const sp = await searchParams;
  const role: Role = sp.role === "DRIVER" ? "DRIVER" : sp.role === "ADMIN" ? "ADMIN" : "PASSENGER";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const users = await db.user.findMany({
    where: {
      role,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
    },
    include: { _count: { select: { bookings: true, complaints: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <>
      <PageHeader title={role === "PASSENGER" ? "Passengers" : role === "DRIVER" ? "Driver accounts" : "Admins"} />
      <form className="mb-4 max-w-sm" role="search">
        <input type="hidden" name="role" value={role} />
        <label htmlFor="q" className="sr-only">
          Search users
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Search name, email or phone" className="h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm focus:border-forest-400 focus:ring-4 focus:ring-forest-100 focus:outline-none" />
      </form>
      <FilterTabs
        label="Role"
        items={(["PASSENGER", "DRIVER", "ADMIN"] as const).map((r) => ({
          label: r === "PASSENGER" ? "Passengers" : r === "DRIVER" ? "Drivers" : "Admins",
          href: `/admin/users?role=${r}`,
          active: role === r,
        }))}
      />
      <Table minWidth={820}>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Contact</Th>
            <Th>Joined</Th>
            <Th>Bookings</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && <EmptyRow colSpan={6}>No users found.</EmptyRow>}
          {users.map((u) => (
            <tr key={u.id}>
              <Td className="font-semibold">
                {u.name} {u.isSeedData && <Badge className="ml-1">seed</Badge>}
              </Td>
              <Td>
                {u.phone}
                <span className="block text-xs text-muted">{u.email}</span>
              </Td>
              <Td className="whitespace-nowrap">{formatDate(u.createdAt)}</Td>
              <Td className="tabular-nums">
                {u._count.bookings}
                {u._count.complaints > 0 && <span className="ml-2 text-xs text-muted">{u._count.complaints} complaints</span>}
              </Td>
              <Td>
                <StatusBadge status={u.status} />
              </Td>
              <Td className="text-right">
                {u.id !== admin.id && u.role !== "ADMIN" &&
                  (u.status === "ACTIVE" ? (
                    <ConfirmAction
                      action={userStatusAction}
                      fields={{ id: u.id, status: "SUSPENDED" }}
                      trigger="Suspend"
                      size="sm"
                      title={`Suspend ${u.name}?`}
                      description="They are signed out immediately and cannot log in until reactivated."
                      confirmLabel="Suspend user"
                      danger
                    />
                  ) : (
                    <ActionButton action={userStatusAction} fields={{ id: u.id, status: "ACTIVE" }}>
                      Reactivate
                    </ActionButton>
                  ))}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
