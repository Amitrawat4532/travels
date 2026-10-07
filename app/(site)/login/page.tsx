import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/session";
import { homeForRole } from "@/auth/guards";
import { LoginForm } from "@/features/auth/auth-forms";
import { Skeleton } from "@/components/ui/misc";
import { AuthShell } from "@/features/auth/auth-shell";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to book seats or manage your rides.">
      <Suspense fallback={<Skeleton className="h-72" />}>
        <Login searchParams={props.searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Login({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const user = await getCurrentUser();
  if (user) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : homeForRole(user.role));
  const showDemo = process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_ACCOUNTS === "true";
  return (
    <>
      <LoginForm next={next} demo={showDemo ? { password: process.env.DEMO_PASSWORD ?? "Pahadi@2026" } : null} />
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-forest-700 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
