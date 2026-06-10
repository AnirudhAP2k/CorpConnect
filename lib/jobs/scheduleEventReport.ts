import { prisma } from "@/lib/db";

/**
 * Enqueues a GENERATE_REPORT job scheduled to run 24 hours after the event ends.
 * Should be called when an event is created or its endDateTime is updated.
 * Safe to call multiple times — the JobQueue deduplicates by eventId reference.
 *
 * @param eventId       The Events.id to generate the report for
 * @param endDateTime   The event end time; report will be scheduled for +24h after this
 */
export async function scheduleEventReport(
    eventId: string,
    endDateTime: Date,
): Promise<void> {

    const scheduledAt = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000); // +24h

    // Idempotent: skip if a pending/completed GENERATE_REPORT already exists for this event
    const existing = await prisma.jobQueue.findFirst({
        where: {
            type: "GENERATE_REPORT",
            payload: { path: ["eventId"], equals: eventId },
            status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
        },
    });

    if (existing) {
        console.log(`[Scheduler] ⏭ GENERATE_REPORT already scheduled for event ${eventId}`);
        return;
    }

    await prisma.jobQueue.create({
        data: {
            type: "GENERATE_REPORT",
            payload: { eventId },
            scheduledAt,
            status: "PENDING",
        },
    });

    console.log(
        `[Scheduler] ✓ GENERATE_REPORT queued for event ${eventId} — runs at ${scheduledAt.toISOString()}`,
    );
}
