"use client";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { useFormAction } from "@/components/ui/use-form-action";
import { changePasswordAction, updateProfileAction } from "@/features/auth/actions";

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const { onSubmit, pending, error, fieldErrors, state } = useFormAction(updateProfileAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Full name" htmlFor="name" error={fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={name} autoComplete="name" />
      </Field>
      <Field label="Mobile number" htmlFor="phone" error={fieldErrors?.phone}>
        <Input id="phone" name="phone" defaultValue={phone} type="tel" inputMode="numeric" maxLength={10} />
      </Field>
      <Field label="Email" htmlFor="email" hint="Contact support to change your login email.">
        <Input id="email" value={email} disabled readOnly />
      </Field>
      <Button type="submit" loading={pending}>
        Save changes
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const { onSubmit, pending, error, fieldErrors, state } = useFormAction(changePasswordAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4" key={state.ok ? "done" : "form"}>
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Current password" htmlFor="currentPassword" error={fieldErrors?.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
      </Field>
      <Field label="New password" htmlFor="newPassword" error={fieldErrors?.newPassword} hint="At least 8 characters with a number">
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={fieldErrors?.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" />
      </Field>
      <Button type="submit" loading={pending}>
        Change password
      </Button>
    </form>
  );
}
