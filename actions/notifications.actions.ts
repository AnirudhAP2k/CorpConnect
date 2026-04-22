"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function createNotification(params: {
    userId: string;
    type: "VERIFICATION" | "INVITE" | "SYSTEM" | "MEETING" | "PAYMENT";
    title: string;
    description: string;
    link?: string;
}) {
    try {
        const notif = await prisma.notification.create({
            data: {
                userId: params.userId,
                type: params.type,
                title: params.title,
                description: params.description,
                link: params.link || null,
            },
        });
        return { success: true, notification: notif };
    } catch (error: any) {
        console.error("Failed to create notification:", error);
        return { success: false, error: error?.message || "Unknown error" };
    }
}

export async function getMyNotifications() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        return { success: true, notifications };
    } catch (error: any) {
        console.error("Failed to fetch notifications:", error);
        return { success: false, error: error?.message || "Unknown error" };
    }
}

export async function markNotificationAsRead(notificationId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        await prisma.notification.update({
            where: { id: notificationId, userId: session.user.id },
            data: { read: true },
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || "Unknown error" };
    }
}

export async function markAllNotificationsAsRead() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        await prisma.notification.updateMany({
            where: { userId: session.user.id, read: false },
            data: { read: true },
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || "Unknown error" };
    }
}
