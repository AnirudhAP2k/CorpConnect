/**
 * Analytics Data Access Layer — Phase 5
 *
 * Provides functions for recording and querying engagement signals:
 * - Event views (with session tracking + duration)
 * - Org→org interaction graph
 * - Tag management
 */

import { prisma } from "@/lib/db";

// ─────────────────────────────────────────────
// EVENT VIEW TRACKING
// ─────────────────────────────────────────────

/**
 * Record the start of an event view session.
 * Increments Events.viewCount for every new session.
 * Returns the created EventView.id for use as sessionId reference.
 */
export async function recordEventView(
    eventId: string,
    userId: string,
    sessionId: string,
    referrer?: string
) {
    try {
        const [view] = await prisma.$transaction([
            prisma.eventView.create({
                data: { eventId, userId, sessionId, referrer: referrer ?? "direct" },
            }),
            prisma.events.update({
                where: { id: eventId },
                data: { viewCount: { increment: 1 } },
            }),
        ]);
        return view;
    } catch (error: any) {
        // Ignore duplicate sessionId (idempotency)
        if (error?.code === "P2002") return null;
        throw error;
    }
}

/**
 * Update the durationSeconds for a view session (called on page leave via sendBeacon).
 * Only updates if duration > 0.
 */
export async function updateViewDuration(sessionId: string, durationSeconds: number) {
    if (durationSeconds <= 0) return null;
    try {
        return await prisma.eventView.update({
            where: { sessionId },
            data: { durationSeconds },
        });
    } catch {
        return null; // Session not found — silently ignore
    }
}

/**
 * Get aggregate view stats for an event (for dashboard/admin).
 */
export async function getEventViewStats(eventId: string) {
    const views = await prisma.eventView.findMany({
        where: { eventId },
        select: { durationSeconds: true, referrer: true, startedAt: true, userId: true },
    });

    const totalViews = views.length;
    const uniqueViewers = new Set(views.map((v) => v.userId)).size;
    const durations = views.map((v) => v.durationSeconds ?? 0).filter((d) => d > 0);
    const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    const referrerBreakdown = views.reduce<Record<string, number>>((acc, v) => {
        const ref = v.referrer ?? "direct";
        acc[ref] = (acc[ref] ?? 0) + 1;
        return acc;
    }, {});

    return { totalViews, uniqueViewers, avgDuration, referrerBreakdown };
}

// ─────────────────────────────────────────────
// ORG INTERACTION RECORDING
// ─────────────────────────────────────────────

/**
 * Record an org→org interaction when org B joins an event hosted by org A.
 * Creates BOTH directions of the relationship graph (A→B and B→A).
 * Idempotent: silently ignores duplicates.
 */
export async function recordOrgInteraction(
    hostOrgId: string,
    attendingOrgId: string,
    sharedEventId: string
) {
    if (hostOrgId === attendingOrgId) return; // Skip self-interaction

    try {
        await prisma.orgInteraction.createMany({
            data: [
                { sourceOrgId: hostOrgId, targetOrgId: attendingOrgId, sharedEventId },
                { sourceOrgId: attendingOrgId, targetOrgId: hostOrgId, sharedEventId },
            ],
            skipDuplicates: true,
        });
    } catch {
        // Silently ignore
    }
}

// ─────────────────────────────────────────────
// TAG SYSTEM
// ─────────────────────────────────────────────

// Read-only tag queries — re-exported for backward compatibility.
// Write helpers (upsertTags, setEventTags, setOrgTags) have been moved to
// "@/domain/tags/helpers" and must be imported directly from there.
export { getTagSuggestions, getEventTags, getOrgTags } from "@/domain/tags";
