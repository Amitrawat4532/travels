"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { useFormAction } from "@/components/ui/use-form-action";
import { updateDriverAboutAction } from "./actions";

export function DriverAboutForm({ bio, languages, yearsExperience }: { bio: string; languages: string; yearsExperience: number }) {
  const { onSubmit, pending, error, fieldErrors, state } = useFormAction(updateDriverAboutAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Profile photo" htmlFor="profilePhoto" hint="Clear face photo · JPG/PNG/WEBP · max 5 MB">
        <input id="profilePhoto" name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-forest-50 file:px-3 file:py-2 file:font-semibold file:text-forest-800" />
      </Field>
      <Field label="Years of experience" htmlFor="yearsExperience" error={fieldErrors?.yearsExperience}>
        <Input id="yearsExperience" name="yearsExperience" type="number" min={0} max={60} defaultValue={yearsExperience} />
      </Field>
      <Field label="Languages" htmlFor="languages" error={fieldErrors?.languages}>
        <Input id="languages" name="languages" defaultValue={languages} />
      </Field>
      <Field label="About you" htmlFor="bio" error={fieldErrors?.bio}>
        <Textarea id="bio" name="bio" maxLength={400} defaultValue={bio} />
      </Field>
      <Button type="submit" loading={pending}>
        Save driver profile
      </Button>
    </form>
  );
}
