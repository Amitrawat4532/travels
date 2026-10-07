import { Skeleton } from "@/components/ui/misc";

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-56 rounded-2xl" />
      <Skeleton className="mt-4 h-40 rounded-2xl" />
    </div>
  );
}
