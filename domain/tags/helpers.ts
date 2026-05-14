/**
 * Internal tag helpers — NOT Server Actions.
 *
 * These functions are intended to be called FROM other domain Server Actions
 * (e.g., domain/events/actions.ts when creating an event). They must NOT be
 * called directly from a Client Component.
 *
 * They are intentionally NOT exported from domain/tags/index.ts.
 * Import from "@/domain/tags/helpers" when you need them in another domain.
 */

import { prisma } from "@/lib/db";

/**
 * Get or create tags by label (case-insensitive).
 * Returns an array of tag IDs.
 */
export async function upsertTags(labels: string[]): Promise<string[]> {
    const normalised = labels
        .map((l) => l.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter(Boolean);

    if (normalised.length === 0) return [];

    await prisma.tag.createMany({
        data: normalised.map((label) => ({ label })),
        skipDuplicates: true,
    });

    const tags = await prisma.tag.findMany({
        where: { label: { in: normalised } },
        select: { id: true },
    });

    return tags.map((t) => t.id);
}

/**
 * Replaces all tags on an event (delete-then-insert in a single transaction).
 * Call this from an authenticated Server Action only.
 */
export async function setEventTags(eventId: string, tagLabels: string[]) {
    const tagIds = await upsertTags(tagLabels);

    await prisma.$transaction([
        prisma.eventTag.deleteMany({ where: { eventId } }),
        prisma.eventTag.createMany({
            data: tagIds.map((tagId) => ({ eventId, tagId })),
            skipDuplicates: true,
        }),
    ]);
}

/**
 * Replaces all tags on an organisation (delete-then-insert in a single transaction).
 * Call this from an authenticated Server Action only.
 */
export async function setOrgTags(orgId: string, tagLabels: string[]) {
    const tagIds = await upsertTags(tagLabels);

    await prisma.$transaction([
        prisma.orgTag.deleteMany({ where: { orgId } }),
        prisma.orgTag.createMany({
            data: tagIds.map((tagId) => ({ orgId, tagId })),
            skipDuplicates: true,
        }),
    ]);
}
