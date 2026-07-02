import { prisma } from "@/lib/db";
import { aiService } from "@/lib/ai-service";
import { checkAiQuota, deductAiUsage } from "@/domain/ai";
import { isUUID } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import type { EventDetail, EventCard, EventWithMemberCheck, GetEventsResult, MatchedOrg } from "./types";
import type { GetEventsInput } from "./validation";

// ─── Single event ─────────────────────────────────────────────────────────────

/**
 * Fetches a full event detail by ID.
 * Returns null for invalid UUIDs or missing events.
 * ISR-tagged with 'events' so revalidateTag propagates immediately.
 */
export const getEventById = unstable_cache(
    async (id: string): Promise<EventDetail | null> => {
        if (!id || !isUUID(id)) return null;

        return prisma.events.findUnique({
            where: { id },
            include: {
                category: true,
                organization: {
                    include: {
                        members: { select: { userId: true, role: true } },
                    },
                },
                participations: {
                    include: {
                        user: { select: { id: true, name: true, image: true } },
                        organization: { select: { id: true, name: true, logo: true } },
                    },
                },
            },
        }) as Promise<EventDetail | null>;
    },
    ["event-by-id"],
    { tags: ["events"] }
);

/**
 * Fetches an event with only the org membership slice needed for permission checks.
 * Filters membership to the requesting userId for O(1) lookup.
 */
export async function getEventWithMemberCheck(
    eventId: string,
    userId: string
): Promise<EventWithMemberCheck | null> {
    return prisma.events.findUnique({
        where: { id: eventId },
        include: {
            organization: {
                include: {
                    members: { where: { userId } },
                },
            },
        },
    }) as Promise<EventWithMemberCheck | null>;
}

// ─── Collections ──────────────────────────────────────────────────────────────

/**
 * Paginated, filtered list of public events.
 * ISR-tagged with 'events' so revalidateTag propagates immediately.
 */
export const getEvents = unstable_cache(
    async (input: GetEventsInput): Promise<GetEventsResult> => {
        const { q, categoryId, organizationId, visibility, upcoming, page, limit } = input;
        const skip = (page - 1) * limit;

        const where: Prisma.EventsWhereInput = { visibility };

        if (q) {
            where.OR = [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
            ];
        }
        if (categoryId) where.categoryId = categoryId;
        if (organizationId) where.organizationId = organizationId;
        if (upcoming) where.startDateTime = { gte: new Date() };

        const [events, total] = await Promise.all([
            prisma.events.findMany({
                where,
                skip,
                take: limit,
                orderBy: { startDateTime: "asc" },
                include: {
                    category: true,
                    organization: { select: { id: true, name: true, logo: true } },
                },
            }),
            prisma.events.count({ where }),
        ]);

        return {
            events: events as EventCard[],
            total,
            page,
            totalPages: Math.ceil(total / limit),
            hasMore: skip + events.length < total,
        };
    },
    ["get-events"],
    { tags: ["events"] }
);

/**
 * Events created by a specific user.
 */
export async function getUserEvents(userId: string): Promise<EventCard[]> {
    return prisma.events.findMany({
        where: { userId },
        include: {
            category: true,
            organization: { select: { id: true, name: true, logo: true } },
        },
        orderBy: { createdAt: "desc" },
    }) as Promise<EventCard[]>;
}

/**
 * Upcoming events hosted by an organization.
 */
export async function getHostEvents(organizationId: string): Promise<EventCard[]> {
    return prisma.events.findMany({
        where: { organizationId, startDateTime: { gte: new Date() } },
        include: {
            category: true,
            organization: { select: { id: true, name: true, logo: true } },
        },
        orderBy: { startDateTime: "asc" },
    }) as Promise<EventCard[]>;
}

/**
 * Upcoming events an organization is attending (as participant).
 */
export async function getAttendingEvents(organizationId: string): Promise<EventCard[]> {
    return prisma.events.findMany({
        where: {
            participations: { some: { organizationId } },
            startDateTime: { gte: new Date() },
        },
        include: {
            category: true,
            organization: { select: { id: true, name: true, logo: true } },
        },
        orderBy: { startDateTime: "asc" },
    }) as Promise<EventCard[]>;
}

/**
 * Past events an organization hosted or attended.
 */
export async function getPastEvents(organizationId: string): Promise<EventCard[]> {
    return prisma.events.findMany({
        where: {
            OR: [
                { organizationId },
                { participations: { some: { organizationId } } },
            ],
            endDateTime: { lt: new Date() },
        },
        include: {
            category: true,
            organization: { select: { id: true, name: true, logo: true } },
        },
        orderBy: { endDateTime: "desc" },
        take: 20,
    }) as Promise<EventCard[]>;
}

// ─── Meeting requests ─────────────────────────────────────────────────────────

/**
 * Returns all meeting requests for a given event/org pair (sent or received).
 */
export async function getMeetingRequestsForEvent(eventId: string, orgId: string) {
    return prisma.meetingRequest.findMany({
        where: {
            eventId,
            OR: [{ senderOrgId: orgId }, { receiverOrgId: orgId }],
        },
        include: {
            senderOrg: { select: { id: true, name: true, logo: true, industry: { select: { label: true } } } },
            receiverOrg: { select: { id: true, name: true, logo: true, industry: { select: { label: true } } } },
            initiatedBy: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
    });
}

// ─── Org matching (AI + SQL fallback) ─────────────────────────────────────────

/**
 * Returns orgs attending the same event that best match the caller's org.
 * Uses AI vector similarity with SQL overlap scoring as fallback.
 */
export async function getMatchingOrgsForEvent(
    eventId: string,
    callerOrgId: string
): Promise<MatchedOrg[]> {
    if (!eventId || !callerOrgId) return [];

    try {
        const participations = await prisma.eventParticipation.findMany({
            where: { eventId, organizationId: { not: null } },
            distinct: ["organizationId"],
            select: { organizationId: true },
        });

        const attendingOrgIds = participations
            .map((p) => p.organizationId!)
            .filter((id) => id !== callerOrgId);

        if (attendingOrgIds.length === 0) return [];

        const event = await prisma.events.findUnique({
            where: { id: eventId },
            select: { organizationId: true },
        });

        const candidateIds = attendingOrgIds.filter((id) => id !== event?.organizationId);
        if (candidateIds.length === 0) return [];

        const aiMatches = await _getMatchingOrgsAI(callerOrgId, candidateIds);
        return aiMatches.length > 0
            ? aiMatches
            : _getMatchingOrgsSQL(callerOrgId, candidateIds);
    } catch (error) {
        console.error("[getMatchingOrgsForEvent]", error);
        return [];
    }
}

async function _getMatchingOrgsAI(
    callerOrgId: string,
    candidateIds: string[]
): Promise<MatchedOrg[]> {
    try {
        // Quota gate — if the org has no remaining AI credits, fall back to SQL
        const quota = await checkAiQuota(callerOrgId, "recommendOrgs");
        if (!quota.allowed) return [];

        const aiRecs = await aiService.recommendOrgs(callerOrgId, 20);
        if (!aiRecs.length) return [];

        await deductAiUsage(callerOrgId);

        const attendingSet = new Set(candidateIds);
        const filtered = aiRecs.filter((r) => attendingSet.has(r.orgId)).slice(0, 5);
        if (!filtered.length) return [];

        const orgs = await prisma.organization.findMany({
            where: { id: { in: filtered.map((r) => r.orgId) } },
            select: {
                id: true, name: true, logo: true, location: true,
                services: true, technologies: true, partnershipInterests: true,
                industry: { select: { label: true } },
            },
        });

        const orgMap = new Map(orgs.map((o) => [o.id, o]));

        return filtered
            .map((r) => {
                const org = orgMap.get(r.orgId);
                if (!org) return null;
                return {
                    ...org,
                    score: Math.round(r.score * 100),
                    matchReason: `${r.sharedEvents} shared event${r.sharedEvents !== 1 ? "s" : ""} · AI match`,
                    source: "ai" as const,
                };
            })
            .filter(Boolean) as MatchedOrg[];
    } catch (err) {
        console.error("[_getMatchingOrgsAI]", err);
        return [];
    }
}

async function _getMatchingOrgsSQL(
    callerOrgId: string,
    candidateIds: string[]
): Promise<MatchedOrg[]> {
    const callerOrg = await prisma.organization.findUnique({
        where: { id: callerOrgId },
        select: { industryId: true, services: true, technologies: true, partnershipInterests: true },
    });
    if (!callerOrg) return [];

    const candidates = await prisma.organization.findMany({
        where: { id: { in: candidateIds } },
        select: {
            id: true, name: true, logo: true, location: true,
            industryId: true, services: true, technologies: true, partnershipInterests: true,
            industry: { select: { label: true } },
        },
    });

    return candidates
        .map((org) => {
            let score = 0;
            const reasons: string[] = [];

            if (org.industryId === callerOrg.industryId) { score += 3; reasons.push("same industry"); }

            const sharedServices = org.services.filter((s) => callerOrg.services.includes(s));
            if (sharedServices.length) { score += sharedServices.length; reasons.push(`${sharedServices.length} shared service`); }

            const sharedTech = org.technologies.filter((t) => callerOrg.technologies.includes(t));
            if (sharedTech.length) { score += sharedTech.length; reasons.push(`${sharedTech.length} shared tech`); }

            const sharedInterests = org.partnershipInterests.filter((i) => callerOrg.partnershipInterests.includes(i));
            if (sharedInterests.length) { score += sharedInterests.length; reasons.push(`${sharedInterests.length} shared interest`); }

            return {
                id: org.id, name: org.name, logo: org.logo, location: org.location,
                industry: org.industry, services: org.services, technologies: org.technologies,
                partnershipInterests: org.partnershipInterests,
                score,
                matchReason: reasons.length ? reasons.join(" · ") : "Also attending",
                source: "sql" as const,
            };
        })
        .filter((o) => o.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}

// ─── Event invites ────────────────────────────────────────────────────────────

/**
 * Fetches an event invite by its unique token.
 * Includes event details (title, image, dates, location, org) and inviter name.
 * Used by the public invite acceptance page.
 */
export async function getEventInviteByToken(token: string) {
    return prisma.eventInvite.findUnique({
        where: { token },
        include: {
            event: {
                include: {
                    organization: {
                        select: { id: true, name: true, logo: true },
                    },
                },
            },
            inviter: {
                select: { id: true, name: true, image: true },
            },
        },
    });
}
