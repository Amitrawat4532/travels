import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { SettingsPageContent } from "@/features/account/account-pages";

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SettingsPageContent role="ADMIN" path="/admin/settings" />
    </Suspense>
  );
}
