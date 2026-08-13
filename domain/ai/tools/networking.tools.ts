import { prisma } from "@/lib/db";
import { getAttendingEvents, getMeetingRequestsForEvent } from "@/domain/events";
import { getBillingStatus } from "@/domain/billing";
import { BillingError } from "@/domain/billing/errors";
import { checkAiQuota, deductAiUsage } from "@/domain/ai/quota";
import { aiService } from "@/lib/ai-service";
import { getOrgConnections, getOrgDashboardStats } from "@/data/dashboard";
import type { ToolContext } from "./types";

/**
 * AI org matchmaking — best-matching organizations for the caller's active org.
 * Uses aiService.recommendOrgs (not the generic Discover Orgs directory search).
 */
export async function discoverOrganizationsHandler({ orgId, toolArgs }: ToolContext) {
    const limit = Math.min(Math.max(Number(toolArgs.limit) || 10, 1), 20);

    const quota = await checkAiQuota(orgId, "recommendOrgs");
    if (!quota.allowed) {
        throw new Error(quota.reason || "AI quota exceeded for organization matchmaking");
    }

    const recommendations = await aiService.recommendOrgs(orgId, limit);
    await deductAiUsage(orgId);

    return {
        count: recommendations.length,
        organizations: recommendations.map((o) => ({
            orgId: o.orgId,
            name: o.name,
            matchScore: o.score,
            sharedEvents: o.sharedEvents,
        })),
    };
}

/** Pending + accepted org connections for the active organization. */
export async function listOrgConnectionsHandler({ orgId, toolArgs }: ToolContext) {
    const statusFilter = String(toolArgs.status || "").toUpperCase();
    const connections = await getOrgConnections(orgId);

    const mapped = connections
        .filter((c) => !statusFilter || c.status === statusFilter)
        .map((c) => {
            const isOutbound = c.sourceOrgId === orgId;
            const counterpart = isOutbound ? c.targetOrg : c.sourceOrg;
            return {
                id: c.id,
                status: c.status,
                direction: isOutbound ? "sent" : "received",
                counterpart: {
                    id: counterpart.id,
                    name: counterpart.name,
                    industry: counterpart.industry?.label ?? null,
                },
                initiatedBy: c.initiatedBy?.name ?? null,
                updatedAt: c.updatedAt,
            };
        });

    return { count: mapped.length, connections: mapped };
}

/** Upcoming events the active org is attending (not hosting). */
export async function listAttendingEventsHandler({ orgId, toolArgs }: ToolContext) {
    const limit = Math.min(Number(toolArgs.limit) || 10, 25);
    const events = await getAttendingEvents(orgId);
    return events.slice(0, limit).map((e) => ({
        id: e.id,
        title: e.title,
        startDateTime: e.startDateTime,
        endDateTime: e.endDateTime,
        location: e.location,
        hostOrg: e.organization
            ? { id: e.organization.id, name: e.organization.name }
            : null,
        category: e.category?.label ?? null,
    }));
}

/** Meeting requests for the active org (optionally filtered by event). */
export async function getMeetingRequestsHandler({ orgId, toolArgs }: ToolContext) {
    const eventId = toolArgs.eventId ? String(toolArgs.eventId).trim() : "";
    const limit = Math.min(Number(toolArgs.limit) || 15, 40);

    if (eventId) {
        const rows = await getMeetingRequestsForEvent(eventId, orgId);
        return {
            eventId,
            count: rows.length,
            requests: rows.slice(0, limit).map(formatMeetingRequest(orgId)),
        };
    }

    const rows = await prisma.meetingRequest.findMany({
        where: {
            OR: [{ senderOrgId: orgId }, { receiverOrgId: orgId }],
        },
        include: {
            senderOrg: {
                select: { id: true, name: true, logo: true, industry: { select: { label: true } } },
            },
            receiverOrg: {
                select: { id: true, name: true, logo: true, industry: { select: { label: true } } },
            },
            initiatedBy: { select: { id: true, name: true } },
            event: { select: { id: true, title: true, startDateTime: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
    });

    return {
        count: rows.length,
        requests: rows.map((r) => ({
            ...formatMeetingRequest(orgId)(r),
            event: r.event
                ? { id: r.event.id, title: r.event.title, startDateTime: r.event.startDateTime }
                : null,
        })),
    };
}

function formatMeetingRequest(orgId: string) {
    return (r: {
        id: string;
        status: string;
        agenda: string | null;
        proposedTime: Date | null;
        senderOrgId: string;
        receiverOrgId: string;
        senderOrg: { id: string; name: string; industry?: { label: string } | null };
        receiverOrg: { id: string; name: string; industry?: { label: string } | null };
        initiatedBy?: { id: string; name: string | null } | null;
        updatedAt: Date;
    }) => {
        const isOutbound = r.senderOrgId === orgId;
        const counterpart = isOutbound ? r.receiverOrg : r.senderOrg;
        return {
            id: r.id,
            status: r.status,
            direction: isOutbound ? "sent" : "received",
            agenda: r.agenda,
            counterpart: {
                id: counterpart.id,
                name: counterpart.name,
                industry: counterpart.industry?.label ?? null,
            },
            initiatedBy: r.initiatedBy?.name ?? null,
            proposedTime: r.proposedTime,
            updatedAt: r.updatedAt,
        };
    };
}

/** High-level dashboard stats for the active organization. */
export async function getOrgDashboardStatsHandler({ orgId }: ToolContext) {
    return getOrgDashboardStats(orgId);
}

/** Members of the active organization (emails only for ADMIN/OWNER). */
export async function listOrgMembersHandler({ orgId, role, toolArgs }: ToolContext) {
    const limit = Math.min(Number(toolArgs.limit) || 50, 100);
    const includeEmail = role === "OWNER" || role === "ADMIN";

    const members = await prisma.organizationMember.findMany({
        where: { organizationId: orgId },
        take: limit,
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        select: {
            role: true,
            createdAt: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    ...(includeEmail ? { email: true } : {}),
                    image: true,
                },
            },
        },
    });

    return {
        count: members.length,
        members: members.map((m) => ({
            userId: m.user.id,
            name: m.user.name,
            role: m.role,
            ...(includeEmail && "email" in m.user ? { email: m.user.email } : {}),
            joinedAt: m.createdAt,
        })),
    };
}

/** Pending org invites addressed to the current user's email. */
export async function listPendingInvitesHandler({ userId }: ToolContext) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });
    if (!user?.email) {
        return { count: 0, invitations: [] };
    }

    const invitations = await prisma.pendingInvite.findMany({
        where: {
            email: user.email,
            status: "PENDING",
            expiresAt: { gte: new Date() },
        },
        include: {
            organization: { select: { id: true, name: true, logo: true } },
            inviter: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
    });

    return {
        count: invitations.length,
        invitations: invitations.map((inv) => ({
            id: inv.id,
            role: inv.role,
            organization: inv.organization,
            invitedBy: inv.inviter?.name ?? inv.inviter?.email ?? null,
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt,
        })),
    };
}

/** Subscription / billing status for the active organization (no payment URLs). */
export async function getBillingStatusHandler({ userId }: ToolContext) {
    try {
        const status = await getBillingStatus(userId);
        return {
            plan: status.plan,
            status: status.status,
            expiresAt: status.expiresAt,
            isVerified: status.isVerified,
            latestSubscription: status.latestSubscription
                ? {
                    provider: status.latestSubscription.provider,
                    plan: status.latestSubscription.plan,
                    status: status.latestSubscription.status,
                    currentPeriodEnd: status.latestSubscription.currentPeriodEnd,
                }
                : null,
            billingPage: "/billing",
        };
    } catch (err) {
        if (err instanceof BillingError) {
            throw new Error(err.message);
        }
        throw err;
    }
}
