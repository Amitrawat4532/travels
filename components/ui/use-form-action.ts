"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { initialActionState, type ActionResult } from "@/lib/action-result";

/**
 * Like useActionState, but submits via onSubmit so React does not reset the
 * form on validation errors (users keep what they typed).
 */
export function useFormAction<T>(
  action: (prev: ActionResult<T>, formData: FormData) => Promise<ActionResult<T>>,
) {
  const [state, dispatch, pending] = useActionState(action, initialActionState as ActionResult<T>);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  }
  const fieldErrors = state.ok ? undefined : state.fieldErrors;
  const error = state.ok ? undefined : state.error || undefined;
  return { state, onSubmit, pending, fieldErrors, error };
}
