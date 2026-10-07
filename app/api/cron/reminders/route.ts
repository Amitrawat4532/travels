import { connection } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendTripReminders } from "@/server/services/trips";

/**
 * Sends trip reminders for departures in the next 24h. Call from a scheduler
 * (Vercel Cron, GitHub Actions, crontab) every 15–30 minutes:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/reminders
 */
export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || auth.length !== expected.length || !timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const sent = await sendTripReminders();
  return Response.json({ ok: true, notificationsSent: sent });
}
