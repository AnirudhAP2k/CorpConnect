/**
 * domain/notifications/handlers/virtual-room-opened.ts
 *
 * Job handler for VIRTUAL_ROOM_OPENED.
 * Triggered immediately when a host creates a virtual room.
 * Notifies all registered participants across all active channels.
 *
 * Called from: lib/jobs/job-processor.ts → case "VIRTUAL_ROOM_OPENED"
 * Enqueued in: app/api/virtual/rooms/route.ts (after successful lv-service call)
 */

import { prisma } from "@/lib/db";
import { sendNotificationToMany } from "@/domain/notifications";
import type { NotificationRecipient } from "@/domain/notifications/types";
import type { VirtualRoomOpenedPayload } from "@/domain/notifications/types";

export type { VirtualRoomOpenedPayload };

export async function processVirtualRoomOpened(payload: VirtualRoomOpenedPayload): Promise<void> {
    const { eventId, roomId } = payload;

    const event = await prisma.events.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            title: true,
            participations: {
                where: { status: { in: ["REGISTERED", "ATTENDED"] } },
                select: {
                    user: { select: { id: true, name: true, email: true } },
                },
            },
        },
    });

    if (!event) {
        console.warn(`[VirtualRoomOpened] Event ${eventId} not found — skipping.`);
        return;
    }

    const recipients: NotificationRecipient[] = event.participations
        .filter((p) => !!p.user.email)
        .map((p) => ({
            userId: p.user.id,
            name:   p.user.name ?? "Attendee",
            email:  p.user.email!,
        }));

    if (recipients.length === 0) {
        console.log(`[VirtualRoomOpened] No eligible participants for event ${eventId}.`);
        return;
    }

    const eventLink = `/events/${event.id}`;

    await sendNotificationToMany(recipients, {
        event: "VIRTUAL_ROOM_OPENED",
        title: "🎉 The virtual room is now open!",
        body:  `The host has opened the virtual session for "${event.title}". Join now!`,
        link:  eventLink,
        data: {
            eventTitle: event.title,
            roomId,
            eventLink,
        },
    });

    console.log(
        `[VirtualRoomOpened] ✓ Notified ${recipients.length} participant(s) — room ${roomId} opened for event "${event.title}".`,
    );
}
