"use server";

/**
 * domain/notifications/actions.ts
 *
 * Authenticated Server Actions (mutations) for the Notifications domain.
 * All write operations on the Notification table are consolidated here.
 *
 * Import from "@/domain/notifications" for all consumer code.
 */

import { prisma } from "@/lib/db";
import { auth } from "@/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

/** String values accepted by the Notification.type column (plain String, not a Prisma enum). */
export type NotificationTypeValue =
    | "VERIFICATION"
    | "INVITE"
    | "SYSTEM"
    | "MEETING"
    | "PAYMENT";

export interface CreateNotificationParams {
    userId: string;
    type: NotificationTypeValue;
    title: string;
    description: string;
    link?: string;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Creates a new in-app notification for a user.
 * Can be called from job handlers or server actions — no auth() check required
 * since the userId is supplied by the caller (server-side context only).
 */
export async function createNotification(
    params: CreateNotificationParams,
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
        const notif = await prisma.notification.create({
            data: {
                userId:      params.userId,
                type:        params.type,
                title:       params.title,
                description: params.description,
                link:        params.link ?? null,
            },
        });
        return { success: true, notificationId: notif.id };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[createNotification]", error);
        return { success: false, error: message };
    }
}

/**
 * Marks a single notification as read.
 * Enforces ownership via userId — users can only update their own notifications.
 */
export async function markNotificationAsRead(
    notificationId: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await prisma.notification.update({
            where: { id: notificationId, userId: session.user.id },
            data: { read: true },
        });

        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: message };
    }
}

/**
 * Marks ALL unread notifications as read for the current user.
 */
export async function markAllNotificationsAsRead(): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        await prisma.notification.updateMany({
            where: { userId: session.user.id, read: false },
            data: { read: true },
        });

        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: message };
    }
}
