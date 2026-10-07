import "server-only";
import { Prisma } from "@prisma/client";

/**
 * Demo mode: lets the public site run without a database (e.g. a preview
 * deployment before Postgres is connected). It turns on when DATABASE_URL is
 * missing, when DEMO_MODE=true, or automatically when the database is
 * unreachable. Public pages then show built-in sample rides; anything that
 * writes data (login, booking, dashboards) explains that it needs the DB.
 */
const FORCED = process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL;
let fellBack = false;

export function isDemoMode(): boolean {
  return FORCED || fellBack;
}

export function isDbUnavailableError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1000", "P1001", "P1002", "P1003", "P1010", "P1017", "P2021"].includes(e.code);
  }
  if (e instanceof Prisma.PrismaClientRustPanicError) return true;
  return false;
}

/** Run a real query, or the demo fallback when there is no usable database. */
export async function withDemo<T>(real: () => Promise<T>, demo: () => T): Promise<T> {
  if (FORCED) return demo();
  try {
    return await real();
  } catch (e) {
    if (!isDbUnavailableError(e)) throw e;
    if (!fellBack) console.warn("[demo] database unavailable — serving demo content", (e as Error).message.split("\n")[0]);
    fellBack = true;
    return demo();
  }
}

export const DEMO_DISABLED_MESSAGE =
  "Yeh demo preview hai — login aur booking database connect hone ke baad shuru honge.";
