/**
 * Tests for domain/events/actions.ts (createEventAction)
 *
 * Focus: authentication, org verification, and the OWNER/ADMIN membership
 * gate that prevents arbitrary signed-in users from creating events.
 */

import { createEventAction } from "@/domain/events/actions";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { scheduleEventReport } from "@/lib/jobs/scheduleEventReport";
import { revalidateTag } from "next/cache";

jest.mock("@/lib/db", () => ({
    prisma: {
        organization: { findUnique: jest.fn() },
        organizationMember: { findFirst: jest.fn() },
        events: { create: jest.fn() },
        jobQueue: { create: jest.fn(() => Promise.resolve({})) },
    },
}));

jest.mock("@/auth", () => ({ auth: jest.fn() }));

jest.mock("next/cache", () => ({
    revalidatePath: jest.fn(),
    revalidateTag: jest.fn(),
    unstable_cache: jest.fn((fn: unknown) => fn),
}));

jest.mock("@/domain/events/queries", () => ({
    getEventWithMemberCheck: jest.fn(),
}));

jest.mock("@/domain/tags/helpers", () => ({
    setEventTags: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/lib/jobs/scheduleEventReport", () => ({
    scheduleEventReport: jest.fn(() => Promise.resolve()),
}));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const ORG_ID = "22222222-2222-4222-8222-222222222222";
const CATEGORY_ID = "44444444-4444-4444-8444-444444444444";
const EVENT_ID = "55555555-5555-4555-8555-555555555555";

// Dates relative to "now" so reminder/report scheduling branches stay stable.
const startDateTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000);

const validEventData = {
    title: "Quarterly Tech Meetup",
    description: "Talks on AI infrastructure and platform engineering.",
    location: "Bangalore HQ, Tower B",
    categoryId: CATEGORY_ID,
    organizationId: ORG_ID,
    imageUrl: "https://cdn.example.com/event.png",
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
};

function signInAs(userId: string | null) {
    (auth as jest.Mock).mockResolvedValue(userId ? { user: { id: userId } } : null);
}

describe("createEventAction", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (prisma.jobQueue.create as jest.Mock).mockResolvedValue({});
    });

    it("rejects unauthenticated callers", async () => {
        signInAs(null);

        const result = await createEventAction(validEventData);

        expect(result).toEqual({ error: "Unauthorized. Please sign in." });
        expect(prisma.events.create).not.toHaveBeenCalled();
    });

    it("rejects invalid payloads (end date before start date)", async () => {
        signInAs(USER_ID);

        const result = await createEventAction({
            ...validEventData,
            endDateTime: new Date(startDateTime.getTime() - 1000).toISOString(),
        });

        expect(result).toEqual({ error: "End date must be after start date" });
        expect(prisma.events.create).not.toHaveBeenCalled();
    });

    it("fails when the organization does not exist", async () => {
        signInAs(USER_ID);
        (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await createEventAction(validEventData);

        expect(result).toEqual({ error: "Organization not found." });
    });

    it("rejects members who are not OWNER or ADMIN", async () => {
        signInAs(USER_ID);
        (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
            isVerified: true,
            name: "Acme Corp",
        });
        (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await createEventAction(validEventData);

        expect(result).toEqual({
            error: "Only organization owners and admins can create events.",
        });
        expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    organizationId: ORG_ID,
                    userId: USER_ID,
                    role: { in: ["OWNER", "ADMIN"] },
                }),
            })
        );
        expect(prisma.events.create).not.toHaveBeenCalled();
    });

    it("blocks unverified organizations with an actionable error code", async () => {
        signInAs(USER_ID);
        (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
            isVerified: false,
            name: "Acme Corp",
        });
        (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({ id: "member-1" });

        const result = await createEventAction(validEventData);

        expect(result).toMatchObject({ code: "ORG_NOT_VERIFIED" });
        expect(prisma.events.create).not.toHaveBeenCalled();
    });

    it("creates the event and schedules background jobs on the happy path", async () => {
        signInAs(USER_ID);
        (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
            isVerified: true,
            name: "Acme Corp",
        });
        (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({ id: "member-1" });
        (prisma.events.create as jest.Mock).mockResolvedValue({
            id: EVENT_ID,
            startDateTime,
            endDateTime,
        });

        const result = await createEventAction(validEventData);

        expect(result).toEqual({ success: true, eventId: EVENT_ID });

        expect(prisma.events.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                image: validEventData.imageUrl,
                organizationId: ORG_ID,
                attendeeCount: 0,
            }),
        });

        // Embedding job + 24h reminder job (start date is a week away).
        const jobTypes = (prisma.jobQueue.create as jest.Mock).mock.calls.map(
            (call) => call[0].data.type
        );
        expect(jobTypes).toContain("EMBED_EVENT");
        expect(jobTypes).toContain("SEND_EVENT_REMINDER");

        // Post-event report scheduled since endDateTime is in the future.
        expect(scheduleEventReport).toHaveBeenCalledWith(EVENT_ID, endDateTime);

        expect(revalidateTag).toHaveBeenCalledWith("events");
    });
});
