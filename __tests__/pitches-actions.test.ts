/**
 * Tests for domain/pitches/actions.ts
 *
 * Focus: identity must come from the server session (IDOR regression guard),
 * plus the enterprise gate, membership checks, and lifecycle rules.
 */

import {
    createPitchAction,
    submitPitchAction,
    updatePitchAction,
    reviewPitchAction,
} from "@/domain/pitches/actions";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { isEnterpriseOrg } from "@/lib/enterprise";
import { createNotification } from "@/domain/notifications";
import { revalidatePath } from "next/cache";

jest.mock("@/lib/db", () => ({
    prisma: {
        eventPitch: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        organizationMember: { findFirst: jest.fn(), findMany: jest.fn() },
        jobQueue: { findFirst: jest.fn(), create: jest.fn() },
    },
}));

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));
jest.mock("@/lib/enterprise", () => ({ isEnterpriseOrg: jest.fn() }));
jest.mock("@/domain/notifications", () => ({ createNotification: jest.fn() }));

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "99999999-9999-4999-8999-999999999999";
const ORG_ID = "22222222-2222-4222-8222-222222222222";
const PITCH_ID = "pitch-1";

const validInput = {
    organizationId: ORG_ID,
    title: "Tech Conference 2027",
    description: "A full-day conference covering AI and cloud.",
    aiBrief: "Generated brief content",
};

const dbPitch = {
    id: PITCH_ID,
    organizationId: ORG_ID,
    proposedById: USER_ID,
    title: validInput.title,
    description: validInput.description,
    aiBrief: validInput.aiBrief,
    location: null,
    startDateTime: null,
    endDateTime: null,
    estimatedBudget: null,
    targetAudience: null,
    agenda: null,
    adminNotes: null,
    eventId: null,
    status: "DRAFT",
    createdAt: new Date("2026-07-01T00:00:00Z"),
    updatedAt: new Date("2026-07-01T00:00:00Z"),
};

function signInAs(userId: string | null) {
    (auth as jest.Mock).mockResolvedValue(userId ? { user: { id: userId } } : null);
}

describe("createPitchAction", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("rejects unauthenticated callers before touching the database", async () => {
        signInAs(null);

        const result = await createPitchAction(validInput);

        expect(result).toEqual({ success: false, error: "Unauthorized" });
        expect(prisma.eventPitch.create).not.toHaveBeenCalled();
    });

    it("rejects invalid input (title too short)", async () => {
        signInAs(USER_ID);

        const result = await createPitchAction({ ...validInput, title: "ab" });

        expect(result.success).toBe(false);
        expect(prisma.eventPitch.create).not.toHaveBeenCalled();
    });

    it("enforces the enterprise gate", async () => {
        signInAs(USER_ID);
        (isEnterpriseOrg as jest.Mock).mockResolvedValue(false);

        const result = await createPitchAction(validInput);

        expect(result).toEqual({
            success: false,
            error: "Event pitching is an Enterprise-only feature.",
        });
    });

    it("rejects callers who are not members of the organization", async () => {
        signInAs(USER_ID);
        (isEnterpriseOrg as jest.Mock).mockResolvedValue(true);
        (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await createPitchAction(validInput);

        expect(result).toEqual({
            success: false,
            error: "You are not a member of this organization.",
        });
    });

    it("derives proposedById from the session, never from client input", async () => {
        signInAs(USER_ID);
        (isEnterpriseOrg as jest.Mock).mockResolvedValue(true);
        (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({ id: "member-1" });
        (prisma.eventPitch.create as jest.Mock).mockResolvedValue(dbPitch);

        // A malicious client attempting to attribute the pitch to someone else.
        const result = await createPitchAction({
            ...validInput,
            proposedById: OTHER_USER_ID,
        } as never);

        expect(result.success).toBe(true);
        expect(prisma.eventPitch.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ proposedById: USER_ID, status: "DRAFT" }),
        });
        // Membership was also checked against the session user, not the spoofed id.
        expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith({
            where: expect.objectContaining({ userId: USER_ID }),
        });
        expect(revalidatePath).toHaveBeenCalledWith(`/organizations/${ORG_ID}/pitches`);
    });

    it("serializes dates to ISO strings for the client", async () => {
        signInAs(USER_ID);
        (isEnterpriseOrg as jest.Mock).mockResolvedValue(true);
        (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({ id: "member-1" });
        (prisma.eventPitch.create as jest.Mock).mockResolvedValue(dbPitch);

        const result = await createPitchAction(validInput);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.createdAt).toBe("2026-07-01T00:00:00.000Z");
            expect(result.data.startDateTime).toBeNull();
        }
    });
});

describe("submitPitchAction", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("rejects unauthenticated callers", async () => {
        signInAs(null);

        const result = await submitPitchAction(PITCH_ID);

        expect(result).toEqual({ success: false, error: "Unauthorized" });
    });

    it("only the pitch author can submit (session-based check)", async () => {
        signInAs(OTHER_USER_ID);
        (prisma.eventPitch.findUnique as jest.Mock).mockResolvedValue(dbPitch);

        const result = await submitPitchAction(PITCH_ID);

        expect(result).toEqual({
            success: false,
            error: "Only the pitch author can submit it.",
        });
        expect(prisma.eventPitch.update).not.toHaveBeenCalled();
    });

    it("cannot submit a pitch that is already under review", async () => {
        signInAs(USER_ID);
        (prisma.eventPitch.findUnique as jest.Mock).mockResolvedValue({
            ...dbPitch,
            status: "PITCHED",
        });

        const result = await submitPitchAction(PITCH_ID);

        expect(result.success).toBe(false);
    });

    it("moves DRAFT to PITCHED and notifies all org admins", async () => {
        signInAs(USER_ID);
        (prisma.eventPitch.findUnique as jest.Mock).mockResolvedValue(dbPitch);
        (prisma.eventPitch.update as jest.Mock).mockResolvedValue({
            ...dbPitch,
            status: "PITCHED",
        });
        (prisma.organizationMember.findMany as jest.Mock).mockResolvedValue([
            { userId: "admin-1" },
            { userId: "admin-2" },
        ]);
        (createNotification as jest.Mock).mockResolvedValue(undefined);

        const result = await submitPitchAction(PITCH_ID);

        expect(result.success).toBe(true);
        expect(prisma.eventPitch.update).toHaveBeenCalledWith({
            where: { id: PITCH_ID },
            data: { status: "PITCHED" },
        });
        expect(createNotification).toHaveBeenCalledTimes(2);
        expect(createNotification).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "admin-1", type: "SYSTEM" })
        );
    });
});

describe("updatePitchAction", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("only the pitch author can edit", async () => {
        signInAs(OTHER_USER_ID);
        (prisma.eventPitch.findUnique as jest.Mock).mockResolvedValue(dbPitch);

        const result = await updatePitchAction(PITCH_ID, { title: "New title" });

        expect(result).toEqual({ success: false, error: "Only the pitch author can edit it." });
        expect(prisma.eventPitch.update).not.toHaveBeenCalled();
    });

    it("cannot edit once the pitch has been approved", async () => {
        signInAs(USER_ID);
        (prisma.eventPitch.findUnique as jest.Mock).mockResolvedValue({
            ...dbPitch,
            status: "APPROVED",
        });

        const result = await updatePitchAction(PITCH_ID, { title: "New title" });

        expect(result.success).toBe(false);
        expect(prisma.eventPitch.update).not.toHaveBeenCalled();
    });
});

describe("reviewPitchAction", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("rejects reviewers who are not ADMIN or OWNER of the org", async () => {
        signInAs(USER_ID);
        (prisma.eventPitch.findUnique as jest.Mock).mockResolvedValue({
            ...dbPitch,
            status: "PITCHED",
        });
        (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await reviewPitchAction(PITCH_ID, { status: "APPROVED" });

        expect(result).toEqual({
            success: false,
            error: "Only admins and owners can review pitches.",
        });
    });

    it("cannot review a pitch that was never submitted", async () => {
        signInAs(USER_ID);
        (prisma.eventPitch.findUnique as jest.Mock).mockResolvedValue(dbPitch); // DRAFT
        (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({ id: "member-1" });

        const result = await reviewPitchAction(PITCH_ID, { status: "APPROVED" });

        expect(result).toEqual({
            success: false,
            error: "Pitch must be submitted before it can be reviewed.",
        });
    });

    it("approval notifies the author and enqueues tasklist generation once", async () => {
        signInAs(OTHER_USER_ID); // an admin reviewing someone else's pitch
        (prisma.eventPitch.findUnique as jest.Mock).mockResolvedValue({
            ...dbPitch,
            status: "PITCHED",
        });
        (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({ id: "member-1" });
        (prisma.eventPitch.update as jest.Mock).mockResolvedValue({
            ...dbPitch,
            status: "APPROVED",
        });
        (prisma.jobQueue.findFirst as jest.Mock).mockResolvedValue(null);
        (createNotification as jest.Mock).mockResolvedValue(undefined);

        const result = await reviewPitchAction(PITCH_ID, { status: "APPROVED" });

        expect(result.success).toBe(true);
        // Author (not the reviewer) gets the notification.
        expect(createNotification).toHaveBeenCalledWith(
            expect.objectContaining({ userId: USER_ID })
        );
        expect(prisma.jobQueue.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                type: "GENERATE_TASKLIST",
                payload: { pitchId: PITCH_ID },
            }),
        });
    });

    it("does not enqueue a duplicate tasklist job", async () => {
        signInAs(OTHER_USER_ID);
        (prisma.eventPitch.findUnique as jest.Mock).mockResolvedValue({
            ...dbPitch,
            status: "PITCHED",
        });
        (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({ id: "member-1" });
        (prisma.eventPitch.update as jest.Mock).mockResolvedValue({
            ...dbPitch,
            status: "APPROVED",
        });
        (prisma.jobQueue.findFirst as jest.Mock).mockResolvedValue({ id: "job-1" });
        (createNotification as jest.Mock).mockResolvedValue(undefined);

        const result = await reviewPitchAction(PITCH_ID, { status: "APPROVED" });

        expect(result.success).toBe(true);
        expect(prisma.jobQueue.create).not.toHaveBeenCalled();
    });
});
