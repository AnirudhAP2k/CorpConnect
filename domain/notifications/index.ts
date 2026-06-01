/**
 * domain/notifications/index.ts
 *
 * Public API for the Notifications domain.
 * All consumer code (job handlers, server actions, API routes, components)
 * should import from "@/domain/notifications" only.
 */

import { getChannels } from "./registry";
import type { NotificationRecipient, NotificationPayload } from "./types";

// ─── Core Dispatch Functions ──────────────────────────────────────────────────

/**
 * Sends a notification to a single recipient across ALL registered channels.
 *
 * Uses Promise.allSettled so a failing channel (e.g. SMS) never blocks
 * a successful channel (e.g. Email + In-App).
 */
export async function sendNotification(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
): Promise<void> {
    const channels = getChannels();

    const results = await Promise.allSettled(
        channels.map((ch) => ch.send(recipient, payload)),
    );

    results.forEach((result, i) => {
        if (result.status === "rejected") {
            console.error(
                `[Notifications] Channel "${channels[i].channelId}" failed for user ${recipient.userId}:`,
                result.reason,
            );
        }
    });
}

/**
 * Convenience wrapper to notify multiple recipients with the same payload.
 */
export async function sendNotificationToMany(
    recipients: NotificationRecipient[],
    payload: NotificationPayload,
): Promise<void> {
    await Promise.allSettled(
        recipients.map((r) => sendNotification(r, payload)),
    );
}

// ─── Queries (read-only) ──────────────────────────────────────────────────────

export {
    getMyNotifications,
    getNotificationsByUserId,
} from "./queries";

// ─── Actions (authenticated mutations) ───────────────────────────────────────

export {
    createNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from "./actions";

export type { CreateNotificationParams, NotificationTypeValue } from "./actions";

// ─── Type Re-exports ──────────────────────────────────────────────────────────

export type {
    NotificationChannel,
    NotificationRecipient,
    NotificationPayload,
    NotificationEvent,
    EventReminderPayload,
    VirtualRoomOpenedPayload,
} from "./types";

