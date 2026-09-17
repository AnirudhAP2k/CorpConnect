import { JobType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { lvFetch } from "@/lib/lv-service";

export interface AutoCreateVirtualRoomPayload {
    eventId: string;
    startsAt: string;
}

export async function scheduleAutoVirtualRoom(input: {
    eventId: string;
    eventType: string;
    startDateTime: Date;
}) {
    if (!["ONLINE", "HYBRID"].includes(input.eventType)) return;

    await prisma.jobQueue.create({
        data: {
            type: JobType.AUTO_CREATE_VIRTUAL_ROOM,
            payload: {
                eventId: input.eventId,
                startsAt: input.startDateTime.toISOString(),
            },
            scheduledAt:
                input.startDateTime > new Date() ? input.startDateTime : new Date(),
        },
    });
}

export async function processAutoCreateVirtualRoom(
    payload: AutoCreateVirtualRoomPayload,
): Promise<void> {
    const event = await prisma.events.findUnique({
        where: { id: payload.eventId },
        select: {
            id: true,
            eventType: true,
            startDateTime: true,
            endDateTime: true,
            organizationId: true,
            virtualRooms: {
                where: { isActive: true },
                select: { id: true },
                take: 1,
            },
            organization: {
                select: {
                    members: {
                        where: { role: { in: ["OWNER", "ADMIN"] } },
                        select: { userId: true, role: true },
                        take: 1,
                    },
                },
            },
        },
    });

    if (!event) return;
    if (event.startDateTime.toISOString() !== payload.startsAt) return;
    if (!["ONLINE", "HYBRID"].includes(event.eventType)) return;
    if (event.endDateTime < new Date()) return;
    if (event.virtualRooms.length > 0) return;
    if (!event.organizationId) {
        throw new Error(`Event ${event.id} has no hosting organization`);
    }

    const host = event.organization?.members[0];
    if (!host) {
        throw new Error(`Event ${event.id} has no OWNER/ADMIN available to create its room`);
    }

    const lvRes = await lvFetch("/rooms", {
        method: "POST",
        body: JSON.stringify({
            eventId: event.id,
            name: "Main Stage",
        }),
        userId: host.userId,
        activeOrgId: event.organizationId,
        role: host.role,
    });
    const data = await lvRes.json();

    if (!lvRes.ok || !data.room?.id) {
        throw new Error(
            `lv-service room creation failed (${lvRes.status}): ${data.error ?? "UNKNOWN_ERROR"}`,
        );
    }

    await prisma.jobQueue.create({
        data: {
            type: JobType.VIRTUAL_ROOM_OPENED,
            payload: {
                roomId: data.room.id,
                eventId: event.id,
            },
        },
    });
}
