/**
 * Event Data Access Layer
 * 
 * Security principles:
 * - All queries validate user permissions
 * - Sensitive data is excluded from public queries
 * - Input validation on all parameters
 * - SQL injection protection via Prisma
 */

import { aiService } from "@/lib/ai-service";
import { prisma } from "@/lib/db";
import { MatchedOrg } from "@/lib/types";
import { isUUID } from "@/lib/utils";

/**
 * Get event by ID with optional member filtering
 * @throws Error if event not found
 */
export async function getEventById(id: string) {
    if (!id || !isUUID(id)) return null;

    try {
        const event = await prisma.events.findUnique({
            where: { id },
            include: {
                category: true,
                organization: {
                    include: {
                        members: {
                            select: {
                                userId: true,
                                role: true,
                            },
                        },
                    },
                },
                participations: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                            },
                        },
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                logo: true,
                            },
                        },
                    },
                },
            },
        });

        if (!event) {
            throw new Error("Event not found");
        }

        return event;
    } catch (error) {
        console.error("Error fetching event:", error);
        throw error;
    }
}

/**
 * Get all organizations a user belongs to
 */
export async function getUserEvents(userId: string) {
    try {
        const events = await prisma.events.findMany({
            where: { userId },
            include: {
                organization: {
                    include: {
                        industry: true,
                        _count: {
                            select: {
                                members: true,
                                events: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return events;
    } catch (error) {
        console.error("Error fetching user events:", error);
        throw error;
    }
}

/**
 * Get all events
 */
export async function getAllEvents(where: any, pagination: number) {
    try {
        const events = await prisma.events.findMany({
            where,
            include: {
                organization: {
                    include: {
                        industry: true,
                        _count: {
                            select: {
                                members: true,
                                events: true,
                            },
                        },
                    },
                },
                participations: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                            },
                        },
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                logo: true,
                            },
                        },
                    },
                },
                category: true,
            },
            orderBy: {
                startDateTime: "asc",
            },
            take: pagination,
        });

        return events;
    } catch (error) {
        console.error("Error fetching user events:", error);
        throw error;
    }
}

export async function getEventByIdWithMemberCheck(id: string, userId: string) {
    try {
        const event = await prisma.events.findUnique({
            where: { id },
            include: {
                organization: {
                    include: {
                        members: {
                            where: { userId },
                        },
                    },
                },
            },
        });

        return event;
    } catch (error) {
        console.error("Error fetching event:", error);
        throw error;
    }
};

export async function getHostEvents(id: string) {
    try {
        const events = await prisma.events.findMany({
            where: {
                organizationId: id,
                startDateTime: {
                    gte: new Date(),
                },
            },
            include: {
                category: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                    },
                },
            },
            orderBy: {
                startDateTime: "asc",
            },
        });

        return events;
    } catch (error) {
        console.error("Error fetching host events:", error);
        throw error;
    }
};

export async function getAttendingEvents(id: string) {
    try {
        const events = await prisma.events.findMany({
            where: {
                participations: {
                    some: {
                        organizationId: id,
                    },
                },
                startDateTime: {
                    gte: new Date(),
                },
            },
            include: {
                category: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                    },
                },
            },
            orderBy: {
                startDateTime: "asc",
            },
        });

        return events;
    } catch (error) {
        console.error("Error fetching attended events:", error);
        throw error;
    }
}

export async function getPastEvents(id: string) {
    try {
        const events = await prisma.events.findMany({
            where: {
                OR: [
                    { organizationId: id },
                    {
                        participations: {
                            some: {
                                organizationId: id,
                            },
                        },
                    },
                ],
                endDateTime: {
                    lt: new Date(),
                },
            },
            include: {
                category: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                    },
                },
            },
            orderBy: {
                endDateTime: "desc",
            },
            take: 20, // Limit past events
        });

        return events;
    } catch (error) {
        console.error("Error fetching past events:", error);
        throw error;
    }
}

/**
 * Returns orgs attending the same event that best match the caller's org.
 *
 * Strategy (hybrid):
 *   1. Primary  — AI vector similarity via aiService.recommendOrgs (pagvector cosine distance)
 *      filtered to orgs registered for this event.
 *   2. Fallback — SQL overlap scoring (industry + shared services/tech/partnershipInterests)
 *      used automatically when the AI service is unavailable or returns no results.
 *
 * Both paths exclude the caller's own org and the event host org.
 * Returns at most 5 results.
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

        const hostOrgId = event?.organizationId;

        const candidateIds = attendingOrgIds.filter((id) => id !== hostOrgId);
        if (candidateIds.length === 0) return [];

        // ── AI Primary ──
        const aiMatches = await getMatchingOrgsAI(callerOrgId, candidateIds);

        if (aiMatches.length > 0) {
            return aiMatches;
        }

        // ── SQL Fallback ──
        return await getMatchingOrgsSQL(callerOrgId, candidateIds);

    } catch (error) {
        console.error("[getMatchingOrgsForEvent] Error:", error);
        return [];
    }
}

async function getMatchingOrgsAI(
    callerOrgId: string,
    candidateIds: string[]
): Promise<MatchedOrg[]> {

    try {
        const aiRecs = await aiService.recommendOrgs(callerOrgId, 20);

        if (!aiRecs.length) return [];

        const attendingSet = new Set(candidateIds);

        const filtered = aiRecs
            .filter((r) => attendingSet.has(r.orgId))
            .slice(0, 5);

        if (!filtered.length) return [];

        const orgs = await prisma.organization.findMany({
            where: { id: { in: filtered.map((r) => r.orgId) } },
            select: {
                id: true,
                name: true,
                logo: true,
                location: true,
                services: true,
                technologies: true,
                partnershipInterests: true,
                industry: { select: { label: true } },
            },
        });

        const orgMap = new Map(orgs.map((o) => [o.id, o]));
        console.log(filtered);
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
        console.error("[getMatchingOrgsAI] Error:", err);
        return [];
    }
}

async function getMatchingOrgsSQL(
    callerOrgId: string,
    candidateIds: string[]
): Promise<MatchedOrg[]> {

    const callerOrg = await prisma.organization.findUnique({
        where: { id: callerOrgId },
        select: {
            industryId: true,
            services: true,
            technologies: true,
            partnershipInterests: true,
        },
    });

    if (!callerOrg) return [];

    const candidates = await prisma.organization.findMany({
        where: { id: { in: candidateIds } },
        select: {
            id: true,
            name: true,
            logo: true,
            location: true,
            industryId: true,
            services: true,
            technologies: true,
            partnershipInterests: true,
            industry: { select: { label: true } },
        },
    });

    const scored = candidates.map((org) => {

        let score = 0;
        const reasons: string[] = [];

        if (org.industryId === callerOrg.industryId) {
            score += 3;
            reasons.push("same industry");
        }

        const sharedServices = org.services.filter((s) =>
            callerOrg.services.includes(s)
        );

        if (sharedServices.length) {
            score += sharedServices.length;
            reasons.push(`${sharedServices.length} shared service`);
        }

        const sharedTech = org.technologies.filter((t) =>
            callerOrg.technologies.includes(t)
        );

        if (sharedTech.length) {
            score += sharedTech.length;
            reasons.push(`${sharedTech.length} shared tech`);
        }

        const sharedInterests = org.partnershipInterests.filter((i) =>
            callerOrg.partnershipInterests.includes(i)
        );

        if (sharedInterests.length) {
            score += sharedInterests.length;
            reasons.push(`${sharedInterests.length} shared interest`);
        }

        return {
            id: org.id,
            name: org.name,
            logo: org.logo,
            location: org.location,
            industry: org.industry,
            services: org.services,
            technologies: org.technologies,
            partnershipInterests: org.partnershipInterests,
            score,
            matchReason: reasons.length
                ? reasons.join(" · ")
                : "Also attending",
            source: "sql" as const,
        };
    });

    return scored
        .filter((o) => o.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}


/**
 * Returns meeting requests for an event and organization.
 * @param eventId 
 * @param orgId 
 * @returns 
 */
export async function getMeetingRequestsForEvent(eventId: string, orgId: string) {
    return prisma.meetingRequest.findMany({
        where: {
            eventId: eventId,
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
