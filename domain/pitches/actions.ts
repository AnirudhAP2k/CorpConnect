"use server";

/**
 * domain/pitches/actions.ts
 *
 * Server Actions for the EventPitch lifecycle.
 *
 * Role rules:
 *  - createPitchAction   → any MEMBER/ADMIN/OWNER of the org (enterprise only)
 *  - submitPitchAction   → pitch owner only (status: DRAFT → PITCHED)
 *  - updatePitchAction   → pitch owner only while status is DRAFT or REVISION_REQUESTED
 *  - reviewPitchAction   → ADMIN or OWNER of the org only
 */

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { OrganizationRole } from "@prisma/client";
import { isEnterpriseOrg } from "@/lib/enterprise";
import { createNotification } from "@/domain/notifications";
import {
    createPitchSchema,
    updatePitchSchema,
    reviewPitchSchema,
} from "./validation";
import type {
    CreatePitchInput,
    UpdatePitchInput,
    ReviewPitchInput,
    ActionResult,
    SerializedEventPitch,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Serialise an EventPitch (Dates → ISO strings) for client components. */
function serialize(pitch: Awaited<ReturnType<typeof prisma.eventPitch.findUniqueOrThrow>>): SerializedEventPitch {
    return {
        ...pitch,
        agenda:         pitch.agenda as SerializedEventPitch["agenda"],
        startDateTime:  pitch.startDateTime?.toISOString() ?? null,
        endDateTime:    pitch.endDateTime?.toISOString() ?? null,
        createdAt:      pitch.createdAt.toISOString(),
        updatedAt:      pitch.updatedAt.toISOString(),
        status:         pitch.status as SerializedEventPitch["status"],
    };
}

/** Verify the org has an ENTERPRISE subscription — delegates to lib/enterprise. */
async function assertEnterprise(orgId: string): Promise<boolean> {
    return isEnterpriseOrg(orgId);
}

/** Verify the user is a member of the org with the given role(s). */
async function assertOrgRole(
    userId: string,
    orgId: string,
    roles: OrganizationRole[],
): Promise<boolean> {
    const membership = await prisma.organizationMember.findFirst({
        where: { userId, organizationId: orgId, role: { in: roles } },
    });
    return membership !== null;
}

// ─── Create Pitch ─────────────────────────────────────────────────────────────

/**
 * Save a new EventPitch in DRAFT status from the AI brainstorm brief.
 * Enterprise gate is enforced here — the server action cannot be bypassed.
 */
export async function createPitchAction(
    input: CreatePitchInput,
): Promise<ActionResult<SerializedEventPitch>> {
    // 1. Validate input
    const parsed = createPitchSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }
    const data = parsed.data;

    // 2. Enterprise gate
    const isEnterprise = await assertEnterprise(data.organizationId);
    if (!isEnterprise) {
        return { success: false, error: "Event pitching is an Enterprise-only feature." };
    }

    // 3. Caller must be a member of the org
    const isMember = await assertOrgRole(data.proposedById, data.organizationId, [
        OrganizationRole.OWNER,
        OrganizationRole.ADMIN,
        OrganizationRole.MEMBER,
    ]);
    if (!isMember) {
        return { success: false, error: "You are not a member of this organization." };
    }

    try {
        const pitch = await prisma.eventPitch.create({
            data: {
                organizationId:  data.organizationId,
                proposedById:    data.proposedById,
                title:           data.title,
                description:     data.description,
                aiBrief:         data.aiBrief,
                location:        data.location ?? null,
                startDateTime:   data.startDateTime ? new Date(data.startDateTime) : null,
                endDateTime:     data.endDateTime   ? new Date(data.endDateTime)   : null,
                estimatedBudget: data.estimatedBudget ?? null,
                targetAudience:  data.targetAudience ?? null,
                agenda:          data.agenda ?? undefined,
                status:          "DRAFT",
            },
        });
        revalidatePath(`/organizations/${data.organizationId}/pitches`);
        return { success: true, data: serialize(pitch) };
    } catch (err) {
        console.error("[createPitchAction]", err);
        return { success: false, error: "Failed to save pitch. Please try again." };
    }
}

// ─── Submit Pitch ─────────────────────────────────────────────────────────────

/**
 * Transition a pitch from DRAFT → PITCHED (submitted to admin for review).
 * Only the pitch author can submit.
 */
export async function submitPitchAction(
    pitchId: string,
    callerUserId: string,
): Promise<ActionResult<SerializedEventPitch>> {
    const pitch = await prisma.eventPitch.findUnique({ where: { id: pitchId } });
    if (!pitch) return { success: false, error: "Pitch not found." };
    if (pitch.proposedById !== callerUserId) {
        return { success: false, error: "Only the pitch author can submit it." };
    }
    if (!["DRAFT", "REVISION_REQUESTED"].includes(pitch.status)) {
        return { success: false, error: `Cannot submit a pitch in ${pitch.status} status.` };
    }

    try {
        const updated = await prisma.eventPitch.update({
            where: { id: pitchId },
            data: { status: "PITCHED" },
        });

        // ── Notify all org Admins/Owners of the new pitch ────────────────────
        const adminMembers = await prisma.organizationMember.findMany({
            where: {
                organizationId: pitch.organizationId,
                role: { in: [OrganizationRole.OWNER, OrganizationRole.ADMIN] },
            },
            select: { userId: true },
        });
        await Promise.allSettled(
            adminMembers.map((m) =>
                createNotification({
                    userId:      m.userId,
                    type:        "SYSTEM",
                    title:       "New Event Pitch Submitted",
                    description: `A member has submitted a new event pitch: "${pitch.title}". Review it in your organization dashboard.`,
                    link:        `/organizations/${pitch.organizationId}/pitches/${pitchId}`,
                }),
            ),
        );

        revalidatePath(`/organizations/${pitch.organizationId}/pitches`);
        return { success: true, data: serialize(updated) };
    } catch (err) {
        console.error("[submitPitchAction]", err);
        return { success: false, error: "Failed to submit pitch." };
    }
}

// ─── Update Pitch ─────────────────────────────────────────────────────────────

/**
 * Update editable fields on a DRAFT or REVISION_REQUESTED pitch.
 * Only the pitch author can update.
 */
export async function updatePitchAction(
    pitchId: string,
    callerUserId: string,
    input: UpdatePitchInput,
): Promise<ActionResult<SerializedEventPitch>> {
    const parsed = updatePitchSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }
    const data = parsed.data;

    const pitch = await prisma.eventPitch.findUnique({ where: { id: pitchId } });
    if (!pitch) return { success: false, error: "Pitch not found." };
    if (pitch.proposedById !== callerUserId) {
        return { success: false, error: "Only the pitch author can edit it." };
    }
    if (!["DRAFT", "REVISION_REQUESTED"].includes(pitch.status)) {
        return { success: false, error: `Cannot edit a pitch in ${pitch.status} status.` };
    }

    try {
        const updated = await prisma.eventPitch.update({
            where: { id: pitchId },
            data: {
                ...data,
                startDateTime: data.startDateTime ? new Date(data.startDateTime) : undefined,
                endDateTime:   data.endDateTime   ? new Date(data.endDateTime)   : undefined,
                agenda:        data.agenda ?? undefined,
            },
        });
        revalidatePath(`/organizations/${pitch.organizationId}/pitches`);
        return { success: true, data: serialize(updated) };
    } catch (err) {
        console.error("[updatePitchAction]", err);
        return { success: false, error: "Failed to update pitch." };
    }
}

// ─── Review Pitch (Admin) ─────────────────────────────────────────────────────

/**
 * Admin/Owner reviews a pitch — can approve, reject, or request revision.
 * Updates adminNotes and status; optionally links to an existing event if approved.
 */
export async function reviewPitchAction(
    pitchId: string,
    callerUserId: string,
    input: ReviewPitchInput,
): Promise<ActionResult<SerializedEventPitch>> {
    const parsed = reviewPitchSchema.safeParse(input);
    if (!parsed.success) {
        return { success: false, error: parsed.error.errors[0]?.message ?? "Invalid review input" };
    }
    const data = parsed.data;

    const pitch = await prisma.eventPitch.findUnique({ where: { id: pitchId } });
    if (!pitch) return { success: false, error: "Pitch not found." };

    // Caller must be ADMIN or OWNER of the org
    const isAdmin = await assertOrgRole(callerUserId, pitch.organizationId, [
        OrganizationRole.OWNER,
        OrganizationRole.ADMIN,
    ]);
    if (!isAdmin) {
        return { success: false, error: "Only admins and owners can review pitches." };
    }
    if (pitch.status === "DRAFT") {
        return { success: false, error: "Pitch must be submitted before it can be reviewed." };
    }

    try {
        const updated = await prisma.eventPitch.update({
            where: { id: pitchId },
            data: {
                status:     data.status,
                adminNotes: data.adminNotes ?? null,
                eventId:    data.status === "APPROVED" ? (data.eventId ?? null) : undefined,
            },
        });

        // ── Notify the pitch author of the review outcome ────────────────────
        const notifMap: Record<string, { title: string; description: string }> = {
            APPROVED:           { title: "Your Pitch Was Approved! 🎉",        description: `Great news! Your event pitch "${pitch.title}" has been approved by your organization admin.` },
            REJECTED:           { title: "Pitch Decision Received",             description: `Your event pitch "${pitch.title}" was not approved at this time. Check admin notes for details.` },
            REVISION_REQUESTED: { title: "Revision Requested on Your Pitch",   description: `Your admin has requested revisions on "${pitch.title}". Please update and resubmit.` },
            IN_REVIEW:          { title: "Your Pitch Is Under Review",          description: `An admin has started reviewing your event pitch "${pitch.title}".` },
        };
        const notif = notifMap[data.status];
        if (notif) {
            await createNotification({
                userId:      pitch.proposedById,
                type:        "SYSTEM",
                title:       notif.title,
                description: notif.description,
                link:        `/organizations/${pitch.organizationId}/pitches/${pitchId}`,
            });
        }

        // ── On approval: enqueue tasklist generation job ─────────────────────
        if (data.status === "APPROVED") {
            const existingJob = await prisma.jobQueue.findFirst({
                where: {
                    type: "GENERATE_TASKLIST",
                    payload: { path: ["pitchId"], equals: pitchId },
                    status: { in: ["PENDING", "PROCESSING", "COMPLETED"] },
                },
            });
            if (!existingJob) {
                await prisma.jobQueue.create({
                    data: {
                        type:        "GENERATE_TASKLIST",
                        payload:     { pitchId },
                        scheduledAt: new Date(),
                        status:      "PENDING",
                    },
                });
            }
        }

        revalidatePath(`/organizations/${pitch.organizationId}/pitches`);
        return { success: true, data: serialize(updated) };
    } catch (err) {
        console.error("[reviewPitchAction]", err);
        return { success: false, error: "Failed to update pitch review." };
    }
}
