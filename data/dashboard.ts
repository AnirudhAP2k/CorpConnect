/**
 * Dashboard Data Access Layer
 *
 * Provides aggregated stats and feed data for:
 * - Organization dashboards (OWNER/ADMIN)
 * - Application Admin dashboard
 * - User dashboard
 */

import { prisma } from "@/lib/db";

// ─────────────────────────────────────────────
// ORGANIZATION DASHBOARD
// ─────────────────────────────────────────────

/**
 * High-level stats for an organisation dashboard header.
 */
export async function getOrgDashboardStats(orgId: string) {
    const [
        eventsHosted,
        membersCount,
        participationsAsHost,
        participationsAsAttendee,
        revenueAggregate,
        eventsAttending,
    ] = await Promise.all([
        // Total events created by this org
        prisma.events.count({ where: { organizationId: orgId } }),

        // Total members
        prisma.organizationMember.count({ where: { organizationId: orgId } }),

        // Total registrations on events this org hosts (attendee count)
        prisma.eventParticipation.count({
            where: {
                event: { organizationId: orgId },
                status: { not: "CANCELLED" },
            },
        }),

        // Total events this org has registered to attend
        prisma.eventParticipation.count({
            where: {
                organizationId: orgId,
                status: { not: "CANCELLED" },
            },
        }),

        // Revenue from this org's paid events
        prisma.eventParticipation.findMany({
            where: {
                event: { organizationId: orgId },
                isPaid: true,
                status: { not: "CANCELLED" },
            },
            select: { totalAmount: true },
        }),

        // Upcoming events this org is attending
        prisma.events.count({
            where: {
                participations: {
                    some: { organizationId: orgId, status: { not: "CANCELLED" } },
                },
                startDateTime: { gte: new Date() },
            },
        }),
    ]);

    const totalRevenue = revenueAggregate.reduce((sum, p) => {
        return sum + (parseFloat(p.totalAmount || "0") || 0);
    }, 0);

    return {
        eventsHosted,
        membersCount,
        participationsAsHost,
        eventsAttending,
        totalRevenue,
    };
}

/**
 * Recent activity feed for an organisation (last 15 participations across its events).
 */
export async function getOrgRecentActivity(orgId: string) {
    const activity = await prisma.eventParticipation.findMany({
        where: {
            event: { organizationId: orgId },
        },
        include: {
            user: { select: { id: true, name: true, image: true } },
            organization: { select: { id: true, name: true, logo: true } },
            event: { select: { id: true, title: true, startDateTime: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
    });

    return activity;
}

/**
 * Revenue breakdown for an org: total, by event (top 5).
 */
export async function getOrgRevenueBreakdown(orgId: string) {
    const participations = await prisma.eventParticipation.findMany({
        where: {
            event: { organizationId: orgId },
            isPaid: true,
            status: { not: "CANCELLED" },
        },
        select: {
            totalAmount: true,
            createdAt: true,
            event: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "asc" },
    });

    // Group by event
    const byEvent: Record<string, { title: string; revenue: number; count: number }> = {};
    let totalRevenue = 0;
    const monthlyRevenue: Record<string, number> = {};

    participations.forEach((p) => {
        const amt = parseFloat(p.totalAmount || "0") || 0;
        totalRevenue += amt;

        // Per event
        const eid = p.event.id;
        if (!byEvent[eid]) byEvent[eid] = { title: p.event.title, revenue: 0, count: 0 };
        byEvent[eid].revenue += amt;
        byEvent[eid].count += 1;

        // Monthly
        const month = p.createdAt.toISOString().slice(0, 7); // "YYYY-MM"
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + amt;
    });

    const topEvents = Object.entries(byEvent)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(([id, data]) => ({ id, ...data }));

    const monthly = Object.entries(monthlyRevenue)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, revenue]) => ({ month, revenue }));

    return { totalRevenue, topEvents, monthly, paidParticipations: participations.length };
}

// ─────────────────────────────────────────────
// USER DASHBOARD
// ─────────────────────────────────────────────

/**
 * Stats for the personal user dashboard.
 */
export async function getUserDashboardStats(userId: string) {
    const [eventsHosted, eventsAttending, upcomingEvents] = await Promise.all([
        prisma.events.count({ where: { userId } }),
        prisma.eventParticipation.count({
            where: { userId, status: { not: "CANCELLED" } },
        }),
        prisma.eventParticipation.findMany({
            where: {
                userId,
                status: "REGISTERED",
                event: { startDateTime: { gte: new Date() } },
            },
            include: {
                event: {
                    include: {
                        category: true,
                        organization: { select: { id: true, name: true, logo: true } },
                    },
                },
            },
            orderBy: { event: { startDateTime: "asc" } },
            take: 5,
        }),
    ]);

    return { eventsHosted, eventsAttending, upcomingEvents };
}

/**
 * Basic event recommendations: public upcoming events in the same industry
 * that the user hasn't joined yet (non-AI, rule-based).
 */
export async function getRecommendedEvents(userId: string, industryId?: string | null) {
    const joinedEventIds = await prisma.eventParticipation.findMany({
        where: { userId },
        select: { eventId: true },
    });
    const excludeIds = joinedEventIds.map((p) => p.eventId);

    const where: any = {
        id: { notIn: excludeIds },
        visibility: "PUBLIC",
        startDateTime: { gte: new Date() },
        userId: { not: userId }, // not created by same user
    };

    if (industryId) {
        where.organization = { industryId };
    }

    const events = await prisma.events.findMany({
        where,
        include: {
            category: true,
            organization: { select: { id: true, name: true, logo: true, industry: true } },
        },
        orderBy: { startDateTime: "asc" },
        take: 4,
    });

    return events;
}

// ─────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────

/**
 * Platform-wide stats for the admin overview.
 */
export async function getAdminPlatformStats() {
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const [
        totalUsers,
        newUsersThisMonth,
        totalOrgs,
        totalEvents,
        totalParticipations,
        newParticipationsThisMonth,
        verifiedOrgs,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: thisMonthStart } } }),
        prisma.organization.count(),
        prisma.events.count(),
        prisma.eventParticipation.count({ where: { status: { not: "CANCELLED" } } }),
        prisma.eventParticipation.count({
            where: { createdAt: { gte: thisMonthStart }, status: { not: "CANCELLED" } },
        }),
        prisma.organization.count({ where: { isVerified: true } }),
    ]);

    return {
        totalUsers,
        newUsersThisMonth,
        totalOrgs,
        verifiedOrgs,
        totalEvents,
        totalParticipations,
        newParticipationsThisMonth,
    };
}

/**
 * Platform-wide revenue stats for the admin dashboard.
 */
export async function getAdminRevenueStats() {
    const participations = await prisma.eventParticipation.findMany({
        where: { isPaid: true, status: { not: "CANCELLED" } },
        select: {
            totalAmount: true,
            createdAt: true,
            organization: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
    });

    let totalRevenue = 0;
    const byOrg: Record<string, { name: string; revenue: number; count: number }> = {};
    const monthlyRevenue: Record<string, number> = {};

    participations.forEach((p) => {
        const amt = parseFloat(p.totalAmount || "0") || 0;
        totalRevenue += amt;

        // Per org
        const orgId = p.organization?.id ?? "individual";
        const orgName = p.organization?.name ?? "Individual";
        if (!byOrg[orgId]) byOrg[orgId] = { name: orgName, revenue: 0, count: 0 };
        byOrg[orgId].revenue += amt;
        byOrg[orgId].count += 1;

        // Monthly
        const month = p.createdAt.toISOString().slice(0, 7);
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + amt;
    });

    const topOrgs = Object.entries(byOrg)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(([id, data]) => ({ id, ...data }));

    const monthly = Object.entries(monthlyRevenue)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12) // last 12 months
        .map(([month, revenue]) => ({ month, revenue }));

    return { totalRevenue, topOrgs, monthly, totalPaidParticipations: participations.length };
}

/**
 * Top organisations for admin list view.
 */
export async function getAdminOrgsList(skip = 0, take = 20, search?: string) {
    const where: any = search
        ? { name: { contains: search, mode: "insensitive" } }
        : {};

    const [orgs, total] = await Promise.all([
        prisma.organization.findMany({
            where,
            include: {
                industry: true,
                _count: { select: { members: true, events: true, participations: true } },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        prisma.organization.count({ where }),
    ]);

    return { orgs, total };
}

/**
 * Users list for admin.
 */
export async function getAdminUsersList(skip = 0, take = 20, search?: string) {
    const where: any = search
        ? {
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ],
        }
        : {};

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            include: {
                organization: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        prisma.user.count({ where }),
    ]);

    return { users, total };
}


/**
 * Events list for admin.
 */
export async function getAdminEventsList(skip = 0, take = 20, search?: string) {
    const where: any = search
        ? { title: { contains: search, mode: "insensitive" } }
        : {};

    const [events, total] = await Promise.all([
        prisma.events.findMany({
            where,
            include: {
                category: true,
                organization: { select: { id: true, name: true } },
                _count: { select: { participations: true } },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take,
        }),
        prisma.events.count({ where }),
    ]);

    return { events, total };
}

/**
 * Job queue health for admin.
 */
export async function getAdminJobQueueHealth() {
    const [pending, processing, completed, failed, cancelled] = await Promise.all([
        prisma.jobQueue.count({ where: { status: "PENDING" } }),
        prisma.jobQueue.count({ where: { status: "PROCESSING" } }),
        prisma.jobQueue.count({ where: { status: "COMPLETED" } }),
        prisma.jobQueue.count({ where: { status: "FAILED" } }),
        prisma.jobQueue.count({ where: { status: "CANCELLED" } }),
    ]);

    const recentFailed = await prisma.jobQueue.findMany({
        where: { status: "FAILED" },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
            id: true,
            type: true,
            error: true,
            attempts: true,
            updatedAt: true,
        },
    });

    return { pending, processing, completed, failed, cancelled, recentFailed };
}

/**
 * Organization connections for admin dashboard.
 */
export async function getOrgConnections(orgId: string) {
    return prisma.orgConnection.findMany({
        where: {
            OR: [
                { sourceOrgId: orgId, status: { in: ["PENDING", "ACCEPTED"] } },
                { targetOrgId: orgId, status: { in: ["PENDING", "ACCEPTED"] } },
            ],
        },
        include: {
            sourceOrg: { select: { id: true, name: true, logo: true, industry: { select: { label: true } } } },
            targetOrg: { select: { id: true, name: true, logo: true, industry: { select: { label: true } } } },
            initiatedBy: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
    });
}
