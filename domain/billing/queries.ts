/**
 * domain/billing/queries.ts
 *
 * Read-side of the Billing domain, for Server Components. API routes and
 * webhooks go through ./service instead, which throws BillingError; pages need
 * a non-throwing result they can turn into a redirect.
 */

import { prisma } from "@/lib/db";
import type { OrganizationRole } from "@prisma/client";

const BILLING_ROLES: OrganizationRole[] = ["OWNER", "ADMIN"];

export type BillingAccess =
    | { allowed: true; orgId: string; role: OrganizationRole }
    | { allowed: false; reason: "no-active-org" | "forbidden" };

/**
 * Resolves the user's active organization and whether they may manage its billing.
 */
export async function getBillingAccess(userId: string): Promise<BillingAccess> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeOrganizationId: true },
    });

    if (!user?.activeOrganizationId) return { allowed: false, reason: "no-active-org" };

    const orgId = user.activeOrganizationId;
    const membership = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        select: { role: true },
    });

    if (!membership || !BILLING_ROLES.includes(membership.role)) {
        return { allowed: false, reason: "forbidden" };
    }

    return { allowed: true, orgId, role: membership.role };
}

/**
 * Plan, payment history and subscription history for the billing page.
 * Returns null when the organization no longer exists.
 */
export async function getBillingOverview(orgId: string) {
    const [org, eventPayments, subscriptions] = await Promise.all([
        prisma.organization.findUnique({
            where: { id: orgId },
            select: {
                name: true,
                subscriptionPlan: true,
                subscriptionStatus: true,
                subscriptionExpiresAt: true,
                isVerified: true,
                _count: { select: { events: true, members: true } },
            },
        }),

        // Recent event payments received for this org's events
        prisma.eventPayment.findMany({
            where: { event: { organizationId: orgId }, status: "SUCCEEDED" },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true,
                amount: true,
                currency: true,
                provider: true,
                status: true,
                createdAt: true,
                event: { select: { title: true } },
            },
        }),

        // Subscription history
        prisma.orgSubscription.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                plan: true,
                provider: true,
                status: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
                cancelledAt: true,
            },
        }),
    ]);

    if (!org) return null;

    const totalRevenue = eventPayments.reduce((sum, payment) => sum + payment.amount, 0);

    return { org, eventPayments, subscriptions, totalRevenue };
}
