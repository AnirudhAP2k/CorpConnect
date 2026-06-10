/**
 * domain/pitches/queries.ts
 *
 * Read-only data fetching for EventPitch.
 * All functions return serialised (Date-free) data safe for Server Components and client props.
 */

import { prisma } from "@/lib/db";
import type { SerializedEventPitch, PitchStatus } from "./types";

// ─── Shared select ────────────────────────────────────────────────────────────

const pitchSelect = {
    id:              true,
    organizationId:  true,
    proposedById:    true,
    title:           true,
    description:     true,
    location:        true,
    startDateTime:   true,
    endDateTime:     true,
    estimatedBudget: true,
    targetAudience:  true,
    agenda:          true,
    aiBrief:         true,
    status:          true,
    adminNotes:      true,
    eventId:         true,
    createdAt:       true,
    updatedAt:       true,
    proposedBy: {
        select: { id: true, name: true, image: true, email: true },
    },
    organization: {
        select: { id: true, name: true, logo: true },
    },
} as const;

// ─── Serialiser ───────────────────────────────────────────────────────────────

function toSerialized(pitch: {
    id: string;
    organizationId: string;
    proposedById: string;
    title: string;
    description: string;
    location: string | null;
    startDateTime: Date | null;
    endDateTime: Date | null;
    estimatedBudget: number | null;
    targetAudience: string | null;
    agenda: unknown;
    aiBrief: string;
    status: string;
    adminNotes: string | null;
    eventId: string | null;
    createdAt: Date;
    updatedAt: Date;
    proposedBy: { id: string; name: string | null; image: string | null; email: string | null } | null;
    organization: { id: string; name: string; logo: string | null } | null;
}): SerializedEventPitch {
    return {
        ...pitch,
        agenda:        pitch.agenda as SerializedEventPitch["agenda"],
        startDateTime: pitch.startDateTime?.toISOString() ?? null,
        endDateTime:   pitch.endDateTime?.toISOString()   ?? null,
        createdAt:     pitch.createdAt.toISOString(),
        updatedAt:     pitch.updatedAt.toISOString(),
        status:        pitch.status as PitchStatus,
        proposedBy:    pitch.proposedBy   ?? undefined,
        organization:  pitch.organization ?? undefined,
    };
}

// ─── Public Queries ───────────────────────────────────────────────────────────

/**
 * Get all pitches for an organization (admins/owners view).
 * Ordered by: PITCHED and IN_REVIEW first, then by updatedAt desc.
 */
export async function getPitchesByOrg(
    organizationId: string,
    statusFilter?: PitchStatus[],
): Promise<SerializedEventPitch[]> {
    const pitches = await prisma.eventPitch.findMany({
        where: {
            organizationId,
            ...(statusFilter ? { status: { in: statusFilter } } : {}),
        },
        select: pitchSelect,
        orderBy: [
            // Surface actionable pitches first
            { status: "asc" },
            { updatedAt: "desc" },
        ],
    });
    return pitches.map(toSerialized);
}

/**
 * Get all pitches submitted by a specific member (member's own view).
 */
export async function getPitchesByMember(
    userId: string,
    organizationId: string,
): Promise<SerializedEventPitch[]> {
    const pitches = await prisma.eventPitch.findMany({
        where: { proposedById: userId, organizationId },
        select: pitchSelect,
        orderBy: { updatedAt: "desc" },
    });
    return pitches.map(toSerialized);
}

/**
 * Get a single pitch by ID.
 * Returns null if not found.
 */
export async function getPitchById(pitchId: string): Promise<SerializedEventPitch | null> {
    const pitch = await prisma.eventPitch.findUnique({
        where: { id: pitchId },
        select: pitchSelect,
    });
    return pitch ? toSerialized(pitch) : null;
}

/**
 * Count pending pitches for an org (for dashboard notification badge).
 */
export async function countPendingPitches(organizationId: string): Promise<number> {
    return prisma.eventPitch.count({
        where: {
            organizationId,
            status: { in: ["PITCHED", "IN_REVIEW"] },
        },
    });
}
