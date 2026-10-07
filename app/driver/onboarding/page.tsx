import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/auth/guards";
import { db } from "@/server/db";
import { getDriverContext } from "@/server/queries/driver";
import { getActiveLocations } from "@/server/queries/rides";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { PageHeader } from "@/components/ui/misc";
import { DriverStatusBanner } from "@/features/driver/components";
import { OnboardingForm } from "@/features/driver/onboarding-form";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requirePageUser(["DRIVER"], "/driver/onboarding");
  let driver = await getDriverContext(user.id);
  if (!driver) {
    await db.driverProfile.create({ data: { userId: user.id } });
    driver = await getDriverContext(user.id);
  }
  if (!driver) redirect("/driver");
  if (driver.status === "VERIFIED" || driver.status === "PENDING") redirect("/driver");
  const locations = await getActiveLocations();

  return (
    <>
      <PageHeader title="Driver registration" description="5 minute ka kaam. Documents check hone ke baad aap rides list kar paoge." />
      {driver.status === "REJECTED" && <DriverStatusBanner status={driver.status} reason={driver.rejectionReason} />}
      <OnboardingForm
        locations={locations}
        hasPhoto={Boolean(driver.user.avatarKey)}
        defaults={{
          licenceNumber: driver.licenceNumber ?? undefined,
          yearsExperience: driver.yearsExperience ?? undefined,
          languages: driver.languages ?? undefined,
          bio: driver.bio ?? undefined,
          baseLocationId: driver.baseLocationId ?? undefined,
        }}
      />
    </>
  );
}
