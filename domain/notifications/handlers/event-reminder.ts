/**
 * domain/notifications/handlers/event-reminder.ts
 *
 * Job handler for SEND_EVENT_REMINDER.
 * Fetches all registered participants for an event and sends a 24-hour
 * reminder notification across all active channels.
 *
 * Called from: lib/jobs/job-processor.ts → case "SEND_EVENT_REMINDER"
 * Enqueued in: domain/events/actions.ts  (on create / startDateTime update)
 */

import { prisma } from "@/lib/db";
import { sendNotificationToMany } from "@/domain/notifications";
import type { NotificationRecipient } from "@/domain/notifications/types";
import type { EventReminderPayload } from "@/domain/notifications/types";

export type { EventReminderPayload };

export async function processEventReminder(payload: EventReminderPayload): Promise<void> {
    const { eventId } = payload;

    const event = await prisma.events.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            title: true,
            startDateTime: true,
            participations: {
                where: { status: { in: ["REGISTERED", "ATTENDED"] } },
                select: {
                    user: { select: { id: true, name: true, email: true } },
                },
            },
        },
    });

    if (!event) {
        console.warn(`[EventReminder] Event ${eventId} not found — skipping.`);
        return;
    }

    const recipients: NotificationRecipient[] = event.participations
        .filter((p) => !!p.user.email)
        .map((p) => ({
            userId: p.user.id,
            name: p.user.name ?? "Attendee",
            email: p.user.email!,
        }));

    if (recipients.length === 0) {
        console.log(`[EventReminder] No eligible participants for event ${eventId}.`);
        return;
    }

    const eventLink = `/events/${event.id}`;

    await sendNotificationToMany(recipients, {
        event: "EVENT_REMINDER_24H",
        title: "Your event starts tomorrow! 🗓️",
        body: `"${event.title}" is starting in 24 hours. Make sure you're ready to join.`,
        link: eventLink,
        data: {
            eventTitle: event.title,
            startDateTime: event.startDateTime,
            eventLink,
        },
    });

    console.log(
        `[EventReminder] ✓ Sent 24h reminder for event "${event.title}" to ${recipients.length} participant(s).`,
    );
}
