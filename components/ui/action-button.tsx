"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { toast } from "./toast";

/** One-click server action button (no confirmation) with pending state + toast. */
export function ActionButton({
  action,
  fields = {},
  children,
  variant = "outline",
  size = "sm",
  className,
  successMessage,
}: {
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  fields?: Record<string, string>;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  successMessage?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      loading={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          for (const [k, v] of Object.entries(fields)) fd.set(k, v);
          const res = await action(fd);
          if (res.ok) {
            toast.success(res.message ?? successMessage ?? "Updated");
            router.refresh();
          } else toast.error(res.error);
        })
      }
    >
      {children}
    </Button>
  );
}
