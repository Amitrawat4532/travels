"use client";

import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { useFormAction } from "@/components/ui/use-form-action";
import { raiseComplaintAction } from "@/features/passenger/actions";

export function ComplaintForm({ bookingId, compact }: { bookingId?: string; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const { onSubmit, pending, error, fieldErrors, state } = useFormAction(raiseComplaintAction);

  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <LifeBuoy className="size-4" aria-hidden /> Report an issue
      </Button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {bookingId && <input type="hidden" name="bookingId" value={bookingId} />}
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Subject" htmlFor="c-subject" error={fieldErrors?.subject}>
        <Input id="c-subject" name="subject" maxLength={120} placeholder="e.g. Driver did not arrive on time" />
      </Field>
      <Field label="What happened?" htmlFor="c-message" error={fieldErrors?.message}>
        <Textarea id="c-message" name="message" maxLength={2000} />
      </Field>
      <Button type="submit" loading={pending} variant="outline">
        Send to support
      </Button>
    </form>
  );
}
