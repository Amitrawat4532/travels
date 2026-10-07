"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { Textarea, Label } from "./form";
import { toast } from "./toast";

type Props = {
  /** Server action receiving FormData with `fields` plus an optional `reason`. */
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  fields?: Record<string, string>;
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  triggerClassName?: string;
  /** Show a textarea; `required` forces the user to fill it in. */
  reason?: { label: string; placeholder?: string; required?: boolean };
  danger?: boolean;
  onDone?: () => void;
};

/** A button that opens an accessible confirmation dialog, then runs a server action. */
export function ConfirmAction({
  action,
  fields = {},
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "outline",
  size = "md",
  triggerClassName,
  reason,
  danger,
  onDone,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const id = useId();

  function submit(formData: FormData) {
    for (const [k, v] of Object.entries(fields)) formData.set(k, v);
    setError(null);
    start(async () => {
      const res = await action(formData);
      if (res.ok) {
        ref.current?.close();
        toast.success(res.message ?? "Done");
        onDone?.();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={triggerClassName}
        onClick={() => {
          setError(null);
          ref.current?.showModal();
        }}
      >
        {trigger}
      </Button>
      <dialog
        ref={ref}
        aria-labelledby={`${id}-title`}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 text-ink shadow-lift"
      >
        <form action={submit} className="p-6">
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {title}
          </h2>
          {description && <div className="mt-2 text-sm text-muted">{description}</div>}
          {reason && (
            <div className="mt-4">
              <Label htmlFor={`${id}-reason`}>{reason.label}</Label>
              <Textarea
                id={`${id}-reason`}
                name="reason"
                required={reason.required}
                minLength={reason.required ? 5 : undefined}
                maxLength={300}
                placeholder={reason.placeholder}
              />
            </div>
          )}
          {error && (
            <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => ref.current?.close()} disabled={pending}>
              Go back
            </Button>
            <Button type="submit" variant={danger ? "danger" : "primary"} loading={pending}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
