import { prisma } from "@/lib/db";
import { getHostEvents, getEventById } from "@/domain/events";
import { revalidateTag } from "next/cache";
import type { ToolContext } from "./types";

export async function listMyEventsHandler({ orgId, toolArgs }: ToolContext) {
    const events = await getHostEvents(orgId);
    const limit = Number(toolArgs.limit) || 10;
    return events.slice(0, limit);
}

export async function getEventDetailsHandler({ toolArgs }: ToolContext) {
    const eventId = String(toolArgs.eventId || "");
    if (!eventId) throw new Error("eventId is required");

    const event = await getEventById(eventId);
    if (!event) throw new Error("Event not found");
    return event;
}

export async function createEventHandler({ orgId, toolArgs }: ToolContext) {
    const title = String(toolArgs.title || "");
    const description = String(toolArgs.description || "");
    const location = String(toolArgs.location || "");
    const startDateTime = String(toolArgs.startDateTime || "");
    const endDateTime = String(toolArgs.endDateTime || "");

    if (!title || !description || !location || !startDateTime || !endDateTime) {
        throw new Error("title, description, location, startDateTime, and endDateTime are required");
    }

    let categoryId = String(toolArgs.categoryId || "");
    if (!categoryId) {
        const defaultCat = await prisma.category.findFirst({ select: { id: true } });
        categoryId = defaultCat?.id || "";
    }

    if (!categoryId) throw new Error("No category available on platform");

    const newEvent = await prisma.events.create({
        data: {
            title,
            description,
            location,
            startDateTime: new Date(startDateTime),
            endDateTime: new Date(endDateTime),
            categoryId,
            organizationId: orgId,
            isFree: toolArgs.isFree !== false,
            price: toolArgs.price ? String(toolArgs.price) : null,
            eventType: (toolArgs.eventType as "ONLINE" | "OFFLINE" | "HYBRID") || "OFFLINE",
            maxAttendees: toolArgs.maxAttendees ? Number(toolArgs.maxAttendees) : null,
            attendeeCount: 0,
        },
    });

    revalidateTag("events");
    return {
        success: true,
        message: `Event "${newEvent.title}" created successfully!`,
        eventId: newEvent.id,
    };
}

export async function updateEventHandler({ orgId, toolArgs }: ToolContext) {
    const eventId = String(toolArgs.eventId || "");
    if (!eventId) throw new Error("eventId is required");

    const existing = await prisma.events.findUnique({
        where: { id: eventId },
        select: { organizationId: true },
    });

    if (!existing || existing.organizationId !== orgId) {
        throw new Error("Event not found or does not belong to your organization");
    }

    const updateData: Record<string, unknown> = {};
    if (toolArgs.title) updateData.title = String(toolArgs.title);
    if (toolArgs.description) updateData.description = String(toolArgs.description);
    if (toolArgs.location) updateData.location = String(toolArgs.location);
    if (toolArgs.startDateTime) updateData.startDateTime = new Date(String(toolArgs.startDateTime));
    if (toolArgs.endDateTime) updateData.endDateTime = new Date(String(toolArgs.endDateTime));

    const updated = await prisma.events.update({
        where: { id: eventId },
        data: updateData,
    });

    revalidateTag("events");
    return {
        success: true,
        message: `Event "${updated.title}" updated successfully!`,
        eventId: updated.id,
    };
}

export async function deleteEventHandler({ orgId, role, toolArgs }: ToolContext) {
    if (!["OWNER", "ADMIN"].includes(role)) {
        throw new Error("Forbidden: Only organization owners and admins can delete events");
    }

    const eventId = String(toolArgs.eventId || "");
    if (!eventId) throw new Error("eventId is required");

    const existing = await prisma.events.findUnique({
        where: { id: eventId },
        select: { organizationId: true, title: true },
    });

    if (!existing || existing.organizationId !== orgId) {
        throw new Error("Event not found or does not belong to your organization");
    }

    await prisma.events.delete({ where: { id: eventId } });

    revalidateTag("events");
    return {
        success: true,
        message: `Event "${existing.title}" deleted successfully.`,
    };
}
