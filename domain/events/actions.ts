"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { JobType } from "@prisma/client";
import { eventSubmitSchema, eventUpdateSchema } from "./validation";
import { getEventWithMemberCheck } from "./queries";
import { setEventTags } from "@/domain/tags/helpers";

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createEventAction(data: Record<string, unknown>) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized. Please sign in." };

    const parsed = eventSubmitSchema.safeParse({ ...data, userId: session.user.id });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const { imageUrl, organizationId, tags, ...rest } = parsed.data;

    try {
        // Verify org exists and is verified before allowing event creation
        const organization = await prisma.organization.findUnique({
            where: { id: organizationId },
            select: { isVerified: true, name: true },
        });

        if (!organization) return { error: "Organization not found." };
        if (!organization.isVerified) {
            return {
                error: `"${organization.name}" is not yet verified. Complete KYB documents to unlock event creation.`,
                code: "ORG_NOT_VERIFIED",
            };
        }

        const event = await prisma.events.create({
            data: { ...rest, image: imageUrl, organizationId, attendeeCount: 0 },
        });

        // Set tags if provided
        if (tags && tags.length > 0) {
            await setEventTags(event.id, tags);
        }

        // Fire-and-forget background embedding job
        prisma.jobQueue.create({
            data: { type: JobType.EMBED_EVENT, payload: { eventId: event.id } },
        }).catch((err) => console.error("[Embed] Failed to enqueue EMBED_EVENT:", err));

        // Schedule 24-hour reminder for all registered participants.
        // scheduledAt is respected by the CRON — fires exactly when due.
        const reminderAt = new Date(event.startDateTime.getTime() - 24 * 60 * 60 * 1000);
        if (reminderAt > new Date()) {
            prisma.jobQueue.create({
                data: {
                    type: JobType.SEND_EVENT_REMINDER,
                    payload: { eventId: event.id },
                    scheduledAt: reminderAt,
                },
            }).catch((err) => console.error("[Reminder] Failed to enqueue SEND_EVENT_REMINDER:", err));
        }

        revalidateTag("events");
        revalidatePath("/events");

        return { success: true, eventId: event.id };
    } catch (error) {
        console.error("[createEventAction]", error);
        return { error: "Failed to create event. Please try again." };
    }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateEventAction(
    eventId: string,
    data: Record<string, unknown>
) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized. Please sign in." };

    const event = await getEventWithMemberCheck(eventId, session.user.id);
    if (!event) return { error: "Event not found." };

    const membership = event.organization?.members[0];
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
        return { error: "Only organization owners and admins can edit events." };
    }

    const parsed = eventUpdateSchema.safeParse({
        ...data,
        userId: session.user.id,
        organizationId: event.organizationId,
    });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const { imageUrl, tags, organizationId: _, userId: __, ...rest } = parsed.data;

    try {
        const updatedEvent = await prisma.events.update({
            where: { id: eventId },
            data: { ...rest, image: imageUrl },
        });

        if (tags !== undefined) {
            await setEventTags(eventId, tags);
        }

        prisma.jobQueue.create({
            data: { type: JobType.EMBED_EVENT, payload: { eventId } },
        }).catch((err) => console.error("[Embed] Failed to enqueue EMBED_EVENT:", err));

        // Re-schedule the 24-hour reminder if startDateTime was changed.
        if (rest.startDateTime) {
            const reminderAt = new Date(new Date(rest.startDateTime).getTime() - 24 * 60 * 60 * 1000);
            if (reminderAt > new Date()) {
                prisma.jobQueue.create({
                    data: {
                        type: JobType.SEND_EVENT_REMINDER,
                        payload: { eventId },
                        scheduledAt: reminderAt,
                    },
                }).catch((err) => console.error("[Reminder] Failed to re-enqueue SEND_EVENT_REMINDER:", err));
            }
        }

        revalidateTag("events");
        revalidatePath(`/events/${eventId}`);
        revalidatePath("/events");

        return { success: true, event: updatedEvent };
    } catch (error) {
        console.error("[updateEventAction]", error);
        return { error: "Failed to update event. Please try again." };
    }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteEventAction(eventId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized. Please sign in." };

    const event = await getEventWithMemberCheck(eventId, session.user.id);
    if (!event) return { error: "Event not found." };

    const membership = event.organization?.members[0];
    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
        return { error: "Only organization owners and admins can delete events." };
    }

    try {
        await prisma.events.delete({ where: { id: eventId } });

        revalidateTag("events");
        revalidatePath("/events");
        if (event.organizationId) {
            revalidatePath(`/organizations/${event.organizationId}`);
        }

        return { success: true };
    } catch (error) {
        console.error("[deleteEventAction]", error);
        return { error: "Failed to delete event. Please try again." };
    }
}
