import "server-only";
import { AuthError } from "@/auth/guards";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/lib/action-result";
import { DEMO_DISABLED_MESSAGE, isDbUnavailableError, isDemoMode } from "@/server/demo";

/**
 * Converts known errors into user-facing ActionResults and hides everything
 * else behind a generic message (details go to the server log only).
 */
export async function safeAction<T>(
  fn: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  if (isDemoMode()) return { ok: false, error: DEMO_DISABLED_MESSAGE };
  try {
    return await fn();
  } catch (e) {
    if (isDbUnavailableError(e)) return { ok: false, error: DEMO_DISABLED_MESSAGE };
    if (e instanceof AuthError) return { ok: false, error: e.message };
    if (isAppError(e)) return { ok: false, error: e.message };
    // Let Next.js control-flow errors (redirect / notFound) propagate.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("[action] unexpected error", e);
    return { ok: false, error: "Kuch gadbad ho gayi. Please try again." };
  }
}
