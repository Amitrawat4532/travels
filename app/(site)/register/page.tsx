import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/session";
import { homeForRole } from "@/auth/guards";
import { RegisterForm } from "@/features/auth/auth-forms";
import { Skeleton } from "@/components/ui/misc";
import { AuthShell } from "@/features/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign up — passengers & drivers",
  description: "Create a free Pahadi Seat account to book shared taxi seats, or register as a driver to fill empty seats on your trips.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage(props: PageProps<"/register">) {
  return (
    <AuthShell title="Create your account" subtitle="Free for passengers and drivers. Takes under a minute.">
      <Suspense fallback={<Skeleton className="h-[520px]" />}>
        <Register searchParams={props.searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Register({ searchParams }: { searchParams: PageProps<"/register">["searchParams"] }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(homeForRole(user.role));
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return (
    <>
      <RegisterForm defaultRole={sp.role === "driver" ? "DRIVER" : "PASSENGER"} next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-forest-700 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
