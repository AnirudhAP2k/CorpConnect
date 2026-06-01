/**
 * domain/notifications/adapters/in-app.adapter.ts
 *
 * Persists notifications to the Notification table so they appear
 * in the user's in-app notification bell.
 */

import { createNotification } from "../queries";
import type { NotificationChannel, NotificationRecipient, NotificationPayload, NotificationEvent } from "../types";
import { prisma } from "@/lib/db";

type NotificationTypeValue = "VERIFICATION" | "INVITE" | "SYSTEM" | "MEETING" | "PAYMENT";

// ─── Event → notification type mapping ───────────────────────────────────────

const EVENT_TYPE_MAP: Record<NotificationEvent, NotificationTypeValue> = {
    EVENT_REMINDER_24H: "SYSTEM",
    VIRTUAL_ROOM_OPENED: "SYSTEM",
    MEETING_REQUESTED: "MEETING",
    MEETING_ACCEPTED: "MEETING",
    MEETING_DECLINED: "MEETING",
    MEETING_CANCELLED: "MEETING",
    CONNECTION_INVITE: "INVITE",
    PAYMENT_RECEIVED: "PAYMENT",
};

export class InAppAdapter implements NotificationChannel {
    readonly channelId = "in-app";

    async send(recipient: NotificationRecipient, payload: NotificationPayload): Promise<void> {
        await createNotification(recipient.userId, EVENT_TYPE_MAP[payload.event], payload.title, payload.body, payload.link);
    }
}
