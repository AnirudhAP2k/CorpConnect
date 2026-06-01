/**
 * domain/notifications/queries.ts
 *
 * Read-only data fetching for the Notifications domain.
 * Safe to use directly in Server Components and API routes.
 */

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import type { Notification } from "@prisma/client";

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches the latest notifications for the currently authenticated user.
 * Intended for Server Actions / Server Components — reads the session internally.
 * Do NOT import this from adapters or job handlers.
 */
export async function getMyNotifications(): Promise<{
    success: boolean;
    notifications?: Notification[];
    error?: string;
}> {
    try {
        const session = await auth();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        return { success: true, notifications };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[getMyNotifications]", error);
        return { success: false, error: message };
    }
}

/**
 * Fetches recent notifications for a user by their ID.
 * For use in Server Components that already hold the session (e.g. TopHeader).
 * Avoids calling auth() a second time when the caller already has the userId.
 *
 * @param userId - The authenticated user's ID
 * @param limit  - Max records to return (default: 20)
 */
export async function getNotificationsByUserId(
    userId: string,
    limit = 20,
): Promise<Notification[]> {
    return prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
    });
}
