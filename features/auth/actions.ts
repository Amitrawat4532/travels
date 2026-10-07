"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { createSession, destroySession, destroyAllSessionsForUser } from "@/auth/session";
import { hashPassword, verifyPassword, fakeVerify } from "@/auth/password";
import { homeForRole, requireUser } from "@/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { changePasswordSchema, loginSchema, profileSchema, registerSchema } from "@/validation/auth";
import { track } from "@/server/analytics";
import { safeAction } from "@/server/safe-action";
import { DEMO_DISABLED_MESSAGE, isDbUnavailableError, isDemoMode } from "@/server/demo";

function safeNext(next: string | undefined | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

export async function loginAction(prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (isDemoMode()) return fail(DEMO_DISABLED_MESSAGE);
  try {
    return await login(prev, formData);
  } catch (e) {
    if (isDbUnavailableError(e)) return fail(DEMO_DISABLED_MESSAGE);
    throw e;
  }
}

async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const { email, password, next } = parsed.data;

  const limit = await rateLimit("login", 10, 15 * 60_000, email);
  if (!limit.allowed) {
    return fail(`Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`);
  }

  const user = await db.user.findUnique({ where: { email } });
  const ok = user ? await verifyPassword(password, user.passwordHash) : await fakeVerify(password);
  if (!user || !ok) return fail("Email or password is incorrect.");
  if (user.status === "SUSPENDED") {
    return fail("Your account is suspended. Please contact support.");
  }

  await createSession(user.id);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  redirect(safeNext(next) ?? homeForRole(user.role));
}

export async function registerAction(prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (isDemoMode()) return fail(DEMO_DISABLED_MESSAGE);
  try {
    return await register(prev, formData);
  } catch (e) {
    if (isDbUnavailableError(e)) return fail(DEMO_DISABLED_MESSAGE);
    throw e;
  }
}

async function register(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const { name, email, phone, password, role } = parsed.data;

  const limit = await rateLimit("register", 6, 60 * 60_000);
  if (!limit.allowed) return fail("Too many sign-ups from this network. Please try again later.");

  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { email: true, phone: true },
  });
  if (existing) {
    return fail("An account already exists.", {
      ...(existing.email === email ? { email: ["This email is already registered — try logging in"] } : {}),
      ...(existing.phone === phone ? { phone: ["This mobile number is already registered"] } : {}),
    });
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash: await hashPassword(password),
      role,
      ...(role === "DRIVER"
        ? { driverProfile: { create: { status: "DRAFT" } } }
        : { passengerProfile: { create: {} } }),
      notifications: {
        create: {
          type: "GENERAL",
          title: role === "DRIVER" ? "Welcome, driver saathi! 🙏" : "Swagat hai! 🙏",
          body:
            role === "DRIVER"
              ? "Submit your licence and vehicle documents. Once verified, you can list rides and fill empty seats."
              : "Search your route, choose a verified driver and book your seat in a minute.",
          link: role === "DRIVER" ? "/driver/onboarding" : "/search",
        },
      },
    },
  });
  track({ type: "SIGNUP", userId: user.id, metadata: { role } });

  await createSession(user.id);
  redirect(role === "DRIVER" ? "/driver/onboarding" : (safeNext(formData.get("next")?.toString()) ?? "/passenger"));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const user = await requireUser();
    const parsed = profileSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
    const clash = await db.user.findFirst({
      where: { phone: parsed.data.phone, NOT: { id: user.id } },
      select: { id: true },
    });
    if (clash) return fail("This mobile number is used by another account.", { phone: ["Already in use"] });
    await db.user.update({ where: { id: user.id }, data: parsed.data });
    return { ok: true, message: "Profile updated" };
  });
}

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return safeAction(async () => {
    const sessionUser = await requireUser();
    const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
    const limit = await rateLimit("change-password", 5, 15 * 60_000, sessionUser.id);
    if (!limit.allowed) return fail("Too many attempts. Please wait a few minutes.");
    const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return fail("Current password is incorrect.", { currentPassword: ["Incorrect password"] });
    }
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword) },
    });
    // Sign out other devices, keep this one.
    await destroyAllSessionsForUser(user.id);
    await createSession(user.id);
    return { ok: true, message: "Password changed. Other devices were signed out." };
  });
}
