import {
    processAutoCreateVirtualRoom,
    scheduleAutoVirtualRoom,
} from "@/lib/jobs/auto-create-virtual-room";
import { prisma } from "@/lib/db";
import { lvFetch } from "@/lib/lv-service";

jest.mock("@/lib/db", () => ({
    prisma: {
        events: { findUnique: jest.fn() },
        jobQueue: { create: jest.fn() },
    },
}));

jest.mock("@/lib/lv-service", () => ({
    lvFetch: jest.fn(),
}));

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";
const HOST_ID = "33333333-3333-4333-8333-333333333333";
const ROOM_ID = "44444444-4444-4444-8444-444444444444";

describe("automatic virtual rooms", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (prisma.jobQueue.create as jest.Mock).mockResolvedValue({});
    });

    it("schedules room creation at the start of online events", async () => {
        const startsAt = new Date(Date.now() + 60_000);

        await scheduleAutoVirtualRoom({
            eventId: EVENT_ID,
            eventType: "ONLINE",
            startDateTime: startsAt,
        });

        expect(prisma.jobQueue.create).toHaveBeenCalledWith({
            data: {
                type: "AUTO_CREATE_VIRTUAL_ROOM",
                payload: {
                    eventId: EVENT_ID,
                    startsAt: startsAt.toISOString(),
                },
                scheduledAt: startsAt,
            },
        });
    });

    it("does not schedule virtual rooms for offline events", async () => {
        await scheduleAutoVirtualRoom({
            eventId: EVENT_ID,
            eventType: "OFFLINE",
            startDateTime: new Date(Date.now() + 60_000),
        });

        expect(prisma.jobQueue.create).not.toHaveBeenCalled();
    });

    it("creates Main Stage and queues its notification when the job is due", async () => {
        const startsAt = new Date(Date.now() - 1_000);
        (prisma.events.findUnique as jest.Mock).mockResolvedValue({
            id: EVENT_ID,
            eventType: "HYBRID",
            startDateTime: startsAt,
            endDateTime: new Date(Date.now() + 60_000),
            organizationId: ORG_ID,
            virtualRooms: [],
            organization: {
                members: [{ userId: HOST_ID, role: "OWNER" }],
            },
        });
        (lvFetch as jest.Mock).mockResolvedValue({
            ok: true,
            status: 201,
            json: jest.fn().mockResolvedValue({ room: { id: ROOM_ID } }),
        });

        await processAutoCreateVirtualRoom({
            eventId: EVENT_ID,
            startsAt: startsAt.toISOString(),
        });

        expect(lvFetch).toHaveBeenCalledWith("/rooms", expect.objectContaining({
            method: "POST",
            userId: HOST_ID,
            activeOrgId: ORG_ID,
            role: "OWNER",
        }));
        expect(prisma.jobQueue.create).toHaveBeenCalledWith({
            data: {
                type: "VIRTUAL_ROOM_OPENED",
                payload: { roomId: ROOM_ID, eventId: EVENT_ID },
            },
        });
    });

    it("skips stale jobs after an event start time changes", async () => {
        (prisma.events.findUnique as jest.Mock).mockResolvedValue({
            id: EVENT_ID,
            eventType: "ONLINE",
            startDateTime: new Date("2030-01-02T10:00:00.000Z"),
            endDateTime: new Date("2030-01-02T11:00:00.000Z"),
            organizationId: ORG_ID,
            virtualRooms: [],
            organization: { members: [{ userId: HOST_ID, role: "OWNER" }] },
        });

        await processAutoCreateVirtualRoom({
            eventId: EVENT_ID,
            startsAt: "2030-01-01T10:00:00.000Z",
        });

        expect(lvFetch).not.toHaveBeenCalled();
    });
});
