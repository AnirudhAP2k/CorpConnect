import { prisma } from "@/lib/db";
import { getUserById } from "@/domain/users";
import { getOrganizationById } from "@/domain/organizations";
import type { ToolContext } from "./types";

export async function getMyProfileHandler({ userId, orgId, role }: ToolContext) {
    const user = await getUserById(userId);
    if (!user) throw new Error("User not found");

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        activeOrganizationId: orgId,
    };
}

export async function getOrgDetailsHandler({ orgId }: ToolContext) {
    const org = await getOrganizationById(orgId);
    if (!org) throw new Error("Organization not found");
    return org;
}

export async function listNotificationsHandler({ userId }: ToolContext) {
    return prisma.notification.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: "desc" },
        take: 5,
    });
}

export async function sendEventInvitesHandler({ userId, orgId, toolArgs }: ToolContext) {
    const eventId = String(toolArgs.eventId || "");
    const emails = Array.isArray(toolArgs.emails) ? toolArgs.emails.map(String) : [];

    if (!eventId || emails.length === 0) {
        throw new Error("eventId and at least one email are required");
    }

    await prisma.pendingInvite.createMany({
        data: emails.map(email => ({
            organizationId: orgId,
            email,
            role: "MEMBER" as const,
            invitedBy: userId,
            token: crypto.randomUUID(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })),
        skipDuplicates: true,
    });

    return {
        success: true,
        message: `Sent invitations to ${emails.length} recipient(s).`,
    };
}
