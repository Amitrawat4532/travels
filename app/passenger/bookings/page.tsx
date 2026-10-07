import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { PassengerBookingsView } from "@/features/booking/passenger-bookings-view";

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PassengerBookingsView scope="all" />
    </Suspense>
  );
}
