"use client";

import { useState } from "react";
import { Camera, ShieldCheck } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";
import { useFormAction } from "@/components/ui/use-form-action";
import { FileField, VehicleFields } from "@/features/vehicles/vehicle-fields";
import { submitOnboardingAction } from "./actions";

export function OnboardingForm({
  locations,
  defaults,
  hasPhoto,
}: {
  locations: { id: string; name: string }[];
  defaults: { licenceNumber?: string; yearsExperience?: number; languages?: string; bio?: string; baseLocationId?: string };
  hasPhoto: boolean;
}) {
  const { onSubmit, pending, error, fieldErrors: fe } = useFormAction(submitOnboardingAction);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-6" noValidate encType="multipart/form-data">
      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <CardHeader title="1. About you" description="Passengers see your photo, experience and languages." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 sm:col-span-2">
            <label className="relative flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-forest-50 text-forest-700 ring-2 ring-forest-100 hover:ring-forest-300">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview
                <img src={photoUrl} alt="Your profile photo" className="size-full object-cover" />
              ) : (
                <Camera className="size-7" aria-hidden />
              )}
              <input
                type="file"
                name="profilePhoto"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPhotoUrl(f ? URL.createObjectURL(f) : null);
                }}
              />
            </label>
            <div className="text-sm">
              <p className="font-semibold">Profile photo {hasPhoto ? "(uploaded — tap to change)" : ""}</p>
              <p className="text-muted">A clear photo of your face, without sunglasses.</p>
              {fe?.profilePhoto && <p className="mt-1 text-danger-500">{fe.profilePhoto[0]}</p>}
            </div>
          </div>
          <Field label="Driving licence number" htmlFor="licenceNumber" error={fe?.licenceNumber}>
            <Input id="licenceNumber" name="licenceNumber" defaultValue={defaults.licenceNumber} className="font-mono uppercase" placeholder="UK0720150012345" />
          </Field>
          <Field label="Licence valid until" htmlFor="licenceExpiry" error={fe?.licenceExpiry}>
            <Input id="licenceExpiry" name="licenceExpiry" type="date" />
          </Field>
          <FileField name="licenceDoc" label="Driving licence (photo or PDF)" error={fe?.licenceDoc} />
          <Field label="Base town" htmlFor="baseLocationId" error={fe?.baseLocationId}>
            <Select id="baseLocationId" name="baseLocationId" defaultValue={defaults.baseLocationId ?? ""}>
              <option value="" disabled>
                Choose town
              </option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Years of driving experience" htmlFor="yearsExperience" error={fe?.yearsExperience}>
            <Input id="yearsExperience" name="yearsExperience" type="number" min={0} max={60} defaultValue={defaults.yearsExperience ?? ""} />
          </Field>
          <Field label="Languages you speak" htmlFor="languages" error={fe?.languages}>
            <Input id="languages" name="languages" defaultValue={defaults.languages ?? "Hindi, Garhwali"} />
          </Field>
          <Field label="A line about you (optional)" htmlFor="bio" className="sm:col-span-2">
            <Textarea id="bio" name="bio" maxLength={400} defaultValue={defaults.bio} placeholder="e.g. 10 saal se Rudraprayag–Dehradun route chala raha hoon." />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="2. Your vehicle" description="Add the vehicle you will use for trips. You can add more later." />
        <CardBody>
          <VehicleFields errors={fe} />
        </CardBody>
      </Card>

      <div className="flex flex-col gap-3 rounded-2xl bg-forest-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-forest-800">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Documents are visible only to our verification team. We never share them with passengers.
        </p>
        <Button type="submit" size="lg" loading={pending}>
          Submit for verification
        </Button>
      </div>
    </form>
  );
}
