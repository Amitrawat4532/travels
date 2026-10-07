import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/auth/guards";
import { getDriverContext } from "@/server/queries/driver";
import { DashboardSkeleton } from "@/components/layout/dashboard-skeleton";
import { Avatar, PageHeader, Rating, KeyValue } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge, VerifiedBadge } from "@/components/ui/badge";
import { ProfileForm } from "@/features/account/account-forms";
import { DriverAboutForm } from "@/features/driver/about-form";
import { formatDateLong } from "@/lib/format";

export default function DriverProfilePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const user = await requirePageUser(["DRIVER"], "/driver/profile");
  const driver = await getDriverContext(user.id);
  if (!driver) redirect("/driver/onboarding");

  return (
    <>
      <PageHeader title="Profile" description="This is what passengers see before booking with you." />
      <div className="grid items-start gap-5 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardBody className="text-center">
            <Avatar name={driver.user.name} src={driver.user.avatarKey ? `/api/files/${driver.user.avatarKey}` : null} size={96} className="mx-auto" />
            <p className="mt-3 text-lg font-bold">{driver.user.name}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {driver.status === "VERIFIED" ? <VerifiedBadge /> : <StatusBadge status={driver.status} />}
              <Rating value={driver.ratingAvg} count={driver.ratingCount} />
            </div>
            <dl className="mt-4 divide-y divide-line text-left">
              <KeyValue label="Completed trips">{driver.completedTrips}</KeyValue>
              <KeyValue label="Base">{driver.baseLocation?.name ?? "—"}</KeyValue>
              <KeyValue label="Licence">{driver.licenceNumber ?? "—"}</KeyValue>
              <KeyValue label="Licence valid till">{driver.licenceExpiry ? formatDateLong(driver.licenceExpiry) : "—"}</KeyValue>
              <KeyValue label="Permit">{driver.permitNumber ?? "—"}</KeyValue>
              {driver.verifiedAt && <KeyValue label="Verified on">{formatDateLong(driver.verifiedAt)}</KeyValue>}
            </dl>
          </CardBody>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Driver details" />
            <CardBody>
              <DriverAboutForm bio={driver.bio ?? ""} languages={driver.languages ?? ""} yearsExperience={driver.yearsExperience ?? 0} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Account" />
            <CardBody>
              <ProfileForm name={user.name} phone={user.phone} email={user.email} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
