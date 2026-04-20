import { prisma } from "@/lib/db";
import type { ConnectionEmailEvent } from "@/lib/email-templates/connection-notification";
import { sendConnectionNotificationEmail } from "@/lib/email-templates/connection-notification";
import { createNotification } from "@/actions/notifications.actions";

/**
 * Payload shape stored in JobQueue.payload for SEND_NOTIFICATION jobs
 * created by the connections API.
 */
interface ConnectionNotificationPayload {
    type: "CONNECTION_REQUEST" | "CONNECTION_ACCEPTED" | "CONNECTION_DECLINED" | "CONNECTION_WITHDRAWN";
    connectionId: string;
}

export async function processConnectionNotification(payload: ConnectionNotificationPayload) {
    const { type, connectionId } = payload;

    // Load the connection with both orgs and their OWNER/ADMIN members
    const connection = await (prisma as any).orgConnection.findUnique({
        where: { id: connectionId },
        include: {
            sourceOrg: {
                include: {
                    members: {
                        where: { role: { in: ["OWNER", "ADMIN"] } },
                        include: { user: { select: { id: true, name: true, email: true } } },
                    },
                },
            },
            targetOrg: {
                include: {
                    members: {
                        where: { role: { in: ["OWNER", "ADMIN"] } },
                        include: { user: { select: { id: true, name: true, email: true } } },
                    },
                },
            },
        },
    });

    if (!connection) {
        console.warn(`[Job] Connection ${connectionId} not found, skipping notification`);
        return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Determine who to notify and what the event is
    const eventMap: Record<string, { emailEvent: ConnectionEmailEvent; notifyOrgId: string }> = {
        CONNECTION_REQUEST: { emailEvent: "REQUESTED", notifyOrgId: connection.targetOrgId },
        CONNECTION_ACCEPTED: { emailEvent: "ACCEPTED", notifyOrgId: connection.sourceOrgId },
        CONNECTION_DECLINED: { emailEvent: "DECLINED", notifyOrgId: connection.sourceOrgId },
        CONNECTION_WITHDRAWN: { emailEvent: "WITHDRAWN", notifyOrgId: connection.targetOrgId },
    };

    const meta = eventMap[type];
    if (!meta) {
        console.warn(`[Job] Unknown connection notification type: ${type}`);
        return;
    }

    const notifyOrg = meta.notifyOrgId === connection.sourceOrgId ? connection.sourceOrg : connection.targetOrg;
    const actorOrg = meta.notifyOrgId === connection.sourceOrgId ? connection.targetOrg : connection.sourceOrg;
    const dashboardLink = `${appUrl}/organizations/${notifyOrg.id}/dashboard`;

    const recipients: { id: string; name: string; email: string }[] = (notifyOrg.members as any[])
        .map((m: any) => ({ id: m.user.id, name: m.user.name || "Admin", email: m.user.email }))
        .filter((r: any) => !!r.email);

    if (recipients.length === 0) {
        console.warn(`[Job] No admin emails found for org ${notifyOrg.id}, skipping`);
        return;
    }

    console.log(`[Job] Sending ${meta.emailEvent} notification to ${recipients.length} admin(s) of ${notifyOrg.name}`);

    await Promise.allSettled(
        recipients.map(async (r) => {
            await sendConnectionNotificationEmail({
                event: meta.emailEvent,
                recipientEmail: r.email,
                recipientName: r.name,
                actorOrgName: actorOrg.name,
                targetOrgName: notifyOrg.name,
                message: meta.emailEvent === "REQUESTED" ? connection.message ?? undefined : undefined,
                dashboardLink,
            });

            await createNotification({
                userId: r.id,
                type: "SYSTEM",
                title: `Connection ${meta.emailEvent}`,
                description: meta.emailEvent === "REQUESTED"
                    ? `${actorOrg.name} wants to connect with your organization.`
                    : `${actorOrg.name} ${meta.emailEvent.toLowerCase()} your connection request.`,
                link: dashboardLink,
            });
        })
    );

    console.log(`[Job] ✓ Connection ${meta.emailEvent} notifications sent for connection ${connectionId}`);
}
