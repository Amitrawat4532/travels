import "server-only";
import { AuthError } from "@/auth/guards";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";

/**
 * Converts known errors into user-facing ActionResults and hides everything
 * else behind a generic message (details go to the server log only).
 */
export async function safeAction<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    if (isAppError(e)) return { ok: false, error: e.message };
    // Let Next.js control-flow errors (redirect / notFound) propagate.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("[action] unexpected error", e);
    return { ok: false, error: "Kuch gadbad ho gayi. Please try again." };
  }
}
