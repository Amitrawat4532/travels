import type { Role } from "@prisma/client";
import { requirePageUser } from "@/auth/guards";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ComplaintForm } from "@/features/booking/complaint-form";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants";
import { PasswordForm, ProfileForm } from "./account-forms";

export async function ProfilePageContent({ role, path }: { role: Role; path: string }) {
  const user = await requirePageUser([role], path);
  return (
    <>
      <PageHeader title="Profile" description="Your name and number are shared only with people you travel with." />
      <Card className="max-w-xl">
        <CardBody>
          <ProfileForm name={user.name} phone={user.phone} email={user.email} />
        </CardBody>
      </Card>
    </>
  );
}

export async function SettingsPageContent({ role, path }: { role: Role; path: string }) {
  await requirePageUser([role], path);
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-4xl gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Password" description="Changing it signs you out of other devices." />
          <CardBody>
            <PasswordForm />
          </CardBody>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Notifications" />
            <CardBody className="pt-2 text-sm text-ink-2">
              You receive in-app notifications for bookings, cancellations, trip changes and reminders. SMS and WhatsApp alerts are
              coming soon.
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Support" description={`${SUPPORT_PHONE} · ${SUPPORT_EMAIL}`} />
            <CardBody className="pt-3">
              <ComplaintForm compact />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
