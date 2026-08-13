import { randomBytes } from "crypto";
import { JobType } from "@prisma/client";
import { revalidatePath } from "next/cache";
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

/**
 * Event email invites — mirrors sendEventInvitesAction without session auth.
 * Requires OWNER/ADMIN; creates EventInvite + SEND_EVENT_INVITE_EMAIL jobs.
 */
export async function sendEventInvitesHandler({ userId, orgId, role, toolArgs }: ToolContext) {
    if (!["OWNER", "ADMIN"].includes(role)) {
        throw new Error("Forbidden: Only organization owners and admins can send event invites");
    }

    const eventId = String(toolArgs.eventId || "");
    const emails = Array.isArray(toolArgs.emails)
        ? toolArgs.emails.map(String).map((e) => e.trim().toLowerCase()).filter(Boolean)
        : [];

    if (!eventId || emails.length === 0) {
        throw new Error("eventId and at least one email are required");
    }

    const event = await prisma.events.findUnique({
        where: { id: eventId },
        select: { organizationId: true, title: true },
    });

    if (!event || !event.organizationId) {
        throw new Error("Event not found or not associated with an organization");
    }

    if (event.organizationId !== orgId) {
        throw new Error("Forbidden: Event does not belong to your organization");
    }

    const existingInvites = await prisma.eventInvite.findMany({
        where: {
            eventId,
            email: { in: emails },
            status: { in: ["PENDING", "SENT", "ACCEPTED"] },
        },
        select: { email: true },
    });

    const alreadyInvited = new Set(existingInvites.map((i) => i.email.toLowerCase()));
    const newEmails = emails.filter((e) => !alreadyInvited.has(e));

    if (newEmails.length === 0) {
        throw new Error("All provided emails have already been invited to this event");
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
        for (const email of newEmails) {
            const token = randomBytes(32).toString("hex");
            const invite = await tx.eventInvite.create({
                data: {
                    eventId,
                    email,
                    token,
                    invitedBy: userId,
                    expiresAt,
                },
            });

            await tx.jobQueue.create({
                data: {
                    type: JobType.SEND_EVENT_INVITE_EMAIL,
                    payload: {
                        inviteId: invite.id,
                        email: invite.email,
                        token: invite.token,
                    },
                },
            });
        }
    });

    revalidatePath(`/events/${eventId}`);

    const skippedCount = emails.length - newEmails.length;
    const message =
        skippedCount > 0
            ? `Sent ${newEmails.length} invitation(s). ${skippedCount} email(s) were already invited.`
            : `Sent ${newEmails.length} invitation(s) successfully.`;

    return {
        success: true,
        message,
        sentCount: newEmails.length,
        skippedCount,
        eventTitle: event.title,
    };
}
