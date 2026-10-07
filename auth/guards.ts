import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getCurrentUser, type SessionUser } from "./session";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN",
  ) {
    super(message);
  }
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "DRIVER":
      return "/driver";
    default:
      return "/passenger";
  }
}

/** For pages: redirect to login when signed out, or home when role mismatches. */
export async function requirePageUser(
  roles?: Role[],
  returnTo?: string,
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${next}`);
  }
  if (roles && !roles.includes(user.role)) redirect(homeForRole(user.role));
  return user;
}

/** For server actions / route handlers: throw instead of redirecting. */
export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Please log in to continue.", "UNAUTHENTICATED");
  if (roles && !roles.includes(user.role)) {
    throw new AuthError("You are not allowed to do this.", "FORBIDDEN");
  }
  return user;
}
