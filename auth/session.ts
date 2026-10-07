import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@prisma/client";
import { db } from "@/server/db";

export const SESSION_COOKIE = "ps_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000; // extend at most once a day

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  avatarKey: string | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
      ipAddress: (h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || null,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

/**
 * Resolve the current user from the session cookie. Memoised per request via
 * React `cache`, so layouts and pages can call it freely.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          avatarKey: true,
        },
      },
    },
  });

  const now = Date.now();
  if (!session || session.expiresAt.getTime() < now) return null;
  if (session.user.status === "SUSPENDED") return null;

  if (now - session.lastSeenAt.getTime() > REFRESH_AFTER_MS) {
    // Rolling expiry; cookie expiry is refreshed on next login. Fire and forget.
    db.session
      .update({
        where: { id: session.id },
        data: { lastSeenAt: new Date(now), expiresAt: new Date(now + SESSION_TTL_MS) },
      })
      .catch(() => undefined);
  }

  const { id, name, email, phone, role, avatarKey } = session.user;
  return { id, name, email, phone, role, avatarKey };
});
