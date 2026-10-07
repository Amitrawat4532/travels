import "server-only";
import { headers } from "next/headers";

/**
 * Fixed-window in-memory rate limiter. Good enough for a single Node instance.
 * For multi-instance deployments swap the store for Redis/Upstash behind the
 * same `rateLimit` signature.
 */
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function rateLimitKey(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > 10_000) sweep(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

function sweep(now: number) {
  for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

/** Rate-limit by action name + client IP (+ optional extra key such as user id). */
export async function rateLimit(
  action: string,
  limit: number,
  windowMs: number,
  extra?: string,
): Promise<RateLimitResult> {
  const ip = await clientIp();
  return rateLimitKey(`${action}:${ip}:${extra ?? ""}`, limit, windowMs);
}
