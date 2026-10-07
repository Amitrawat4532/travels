import "server-only";
import type { NotificationType, Prisma } from "@prisma/client";
import { db } from "@/server/db";

export type NotificationPayload = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
};

/**
 * Delivery channels. In-app is always on (it is the Notification table).
 * SMS / WhatsApp / email channels implement this interface and are enabled
 * via env vars — see README "Notifications".
 */
export interface NotificationChannel {
  name: string;
  isEnabled(): boolean;
  send(payload: NotificationPayload & { phone?: string; email?: string }): Promise<void>;
}

class LogChannel implements NotificationChannel {
  constructor(
    public name: string,
    private envFlag: string,
  ) {}
  isEnabled() {
    return process.env[this.envFlag] === "true";
  }
  async send(payload: NotificationPayload & { phone?: string; email?: string }) {
    // Replace with a real provider (MSG91 / Gupshup / Twilio / Resend …).
    console.info(`[notify:${this.name}]`, payload.type, payload.phone ?? payload.email, payload.title);
  }
}

const externalChannels: NotificationChannel[] = [
  new LogChannel("sms", "NOTIFY_SMS_ENABLED"),
  new LogChannel("whatsapp", "NOTIFY_WHATSAPP_ENABLED"),
  new LogChannel("email", "NOTIFY_EMAIL_ENABLED"),
];

type Tx = Prisma.TransactionClient;

/** Create in-app notifications (optionally inside an existing transaction). */
export async function notify(payloads: NotificationPayload[], tx: Tx = db): Promise<void> {
  if (payloads.length === 0) return;
  await tx.notification.createMany({ data: payloads });
}

/**
 * Fan out to external channels after the DB transaction has committed.
 * Failures never break the user flow.
 */
export async function dispatchExternal(payloads: NotificationPayload[]): Promise<void> {
  const enabled = externalChannels.filter((c) => c.isEnabled());
  if (enabled.length === 0 || payloads.length === 0) return;
  const users = await db.user.findMany({
    where: { id: { in: [...new Set(payloads.map((p) => p.userId))] } },
    select: { id: true, phone: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  await Promise.allSettled(
    payloads.flatMap((p) =>
      enabled.map((c) => c.send({ ...p, phone: byId.get(p.userId)?.phone, email: byId.get(p.userId)?.email })),
    ),
  );
}

export async function notifyAndDispatch(payloads: NotificationPayload[]): Promise<void> {
  await notify(payloads);
  void dispatchExternal(payloads);
}
