import { connection } from "next/server";
import { getCurrentUser } from "@/auth/session";
import { db } from "@/server/db";
import { mimeForKey, storage } from "@/server/storage";

/**
 * Serves uploaded files.
 *  - Driver profile photos and vehicle photos are public (shown on ride pages).
 *  - Verification documents (licence, RC, insurance, permit) are private:
 *    only the owning driver and admins can open them.
 */
const PUBLIC_KEY = /^drivers\/[0-9a-f-]{36}\/(profile|vehicle-photos)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
const ANY_KEY = /^(drivers\/[0-9a-f-]{36}\/((profile|vehicle-photos)\/)?[0-9a-f-]{36}\.(jpg|png|webp|pdf)|seed\/sample-document\.pdf)$/;

export async function GET(_req: Request, ctx: RouteContext<"/api/files/[...key]">) {
  await connection();
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!ANY_KEY.test(key)) return new Response("Not found", { status: 404 });

  const isPublic = PUBLIC_KEY.test(key);
  if (!isPublic) {
    const user = await getCurrentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    if (user.role !== "ADMIN") {
      const driver = user.role === "DRIVER" ? await db.driverProfile.findUnique({ where: { userId: user.id }, select: { id: true } }) : null;
      const ownsDoc = driver && (key.startsWith(`drivers/${driver.id}/`) || key.startsWith("seed/"));
      if (!ownsDoc) return new Response("Not found", { status: 404 });
    }
  }

  const data = await storage.get(key);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mimeForKey(key),
      "Content-Disposition": "inline",
      "Cache-Control": isPublic ? "public, max-age=86400, immutable" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
