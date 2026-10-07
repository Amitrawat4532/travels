import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { ProfilePageContent } from "@/features/account/account-pages";

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ProfilePageContent role="DRIVER" path="/driver/profile" />
    </Suspense>
  );
}
