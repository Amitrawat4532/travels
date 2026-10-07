"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, User, Car } from "lucide-react";
import { Field, Input, Checkbox } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/components/ui/use-form-action";
import { Alert } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { loginAction, registerAction } from "./actions";

function PasswordInput({ id, name, invalid, autoComplete }: { id: string; name: string; invalid?: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        required
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        className="pr-12"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-ink"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next, demo }: { next?: string; demo?: { password: string } | null }) {
  const { onSubmit, pending, fieldErrors: fe, error } = useFormAction(loginAction);

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Email" htmlFor="email" error={fe?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={!!fe?.email || undefined} />
      </Field>
      <Field label="Password" htmlFor="password" error={fe?.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" invalid={!!fe?.password} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Log in
      </Button>
      {demo && <DemoAccounts password={demo.password} />}
    </form>
  );
}

function DemoAccounts({ password }: { password: string }) {
  function fill(email: string) {
    const e = document.getElementById("email") as HTMLInputElement | null;
    const p = document.getElementById("password") as HTMLInputElement | null;
    if (e && p) {
      e.value = email;
      p.value = password;
    }
  }
  return (
    <div className="rounded-xl border border-dashed border-marigold-400/60 bg-marigold-50 p-3 text-sm">
      <p className="font-semibold text-marigold-700">Development demo accounts</p>
      <p className="mt-0.5 text-xs text-marigold-700/80">
        Password: <code className="font-mono">{password}</code> · hidden in production
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[
          ["Passenger", "passenger@demo.com"],
          ["Driver", "driver@demo.com"],
          ["Admin", "admin@demo.com"],
        ].map(([label, email]) => (
          <button
            key={email}
            type="button"
            onClick={() => fill(email!)}
            className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-line hover:ring-forest-300"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RegisterForm({ defaultRole = "PASSENGER", next }: { defaultRole?: "PASSENGER" | "DRIVER"; next?: string }) {
  const { onSubmit, pending, fieldErrors: fe, error } = useFormAction(registerAction);
  const [role, setRole] = useState(defaultRole);

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="role" value={role} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-2">I want to</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["PASSENGER", "Book seats", User],
              ["DRIVER", "Offer seats", Car],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={role === value}
              onClick={() => setRole(value)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-colors",
                role === value
                  ? "border-forest-600 bg-forest-50 text-forest-800 ring-2 ring-forest-100"
                  : "border-line bg-white text-ink-2 hover:border-forest-300",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
              <span className="sr-only">{value === "DRIVER" ? "(driver account)" : "(passenger account)"}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {error && <Alert tone="error">{error}</Alert>}

      <Field label="Full name" htmlFor="name" error={fe?.name}>
        <Input id="name" name="name" autoComplete="name" required aria-invalid={!!fe?.name || undefined} />
      </Field>
      <Field label="Mobile number" htmlFor="phone" error={fe?.phone} hint={role === "DRIVER" ? "Passengers will call you on this number" : "Driver will call you on this number"}>
        <div className="flex">
          <span className="inline-flex h-12 items-center rounded-l-xl border border-r-0 border-line bg-paper-2 px-3 text-sm text-muted">+91</span>
          <Input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} required className="rounded-l-none" aria-invalid={!!fe?.phone || undefined} />
        </div>
      </Field>
      <Field label="Email" htmlFor="email" error={fe?.email}>
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" required aria-invalid={!!fe?.email || undefined} />
      </Field>
      <Field label="Password" htmlFor="password" error={fe?.password} hint="At least 8 characters with a number">
        <PasswordInput id="password" name="password" autoComplete="new-password" invalid={!!fe?.password} />
      </Field>
      <div>
        <label className="flex items-start gap-3 text-sm text-ink-2">
          <Checkbox name="acceptTerms" className="mt-0.5" required />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="font-semibold text-forest-700 underline-offset-2 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-semibold text-forest-700 underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
          </span>
        </label>
        {fe?.acceptTerms && <p className="mt-1.5 text-sm text-danger-500">{fe.acceptTerms[0]}</p>}
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        {role === "DRIVER" ? "Create driver account" : "Create account"}
      </Button>
    </form>
  );
}
