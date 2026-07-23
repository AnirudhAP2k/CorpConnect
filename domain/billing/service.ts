/**
 * domain/billing/service.ts
 *
 * Billing business logic (auth-context in, provider-agnostic out). Routes stay
 * thin: they authenticate, parse input, call these functions, and map
 * BillingError → HTTP status.
 */

import { prisma } from "@/lib/db";
import { getPaymentGateway } from "./gateway";
import { BillingError } from "./errors";
import type { BillingOrg, BillingPlan, PaymentProvider, PortalSession, SubscriptionCheckout } from "./gateway/types";

function appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/** Resolves the user's active org and asserts OWNER/ADMIN billing permission. */
async function resolveBillingOrg(userId: string): Promise<BillingOrg> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeOrganizationId: true },
    });
    if (!user?.activeOrganizationId) {
        throw new BillingError(400, "No active organization. Please select an organization first.");
    }

    const orgId = user.activeOrganizationId;

    const membership = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        select: { role: true },
    });
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
        throw new BillingError(403, "Only OWNER or ADMIN can manage billing");
    }

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, stripeCustomerId: true, razorpayCustomerId: true },
    });
    if (!org) {
        throw new BillingError(404, "Organization not found");
    }

    return org;
}

export async function createBillingCheckout(input: {
    userId: string;
    plan: BillingPlan;
    provider: PaymentProvider;
}): Promise<SubscriptionCheckout> {
    const org = await resolveBillingOrg(input.userId);
    const gateway = getPaymentGateway(input.provider);
    return gateway.createSubscriptionCheckout({ org, plan: input.plan, appUrl: appUrl() });
}

export async function createBillingPortal(userId: string): Promise<PortalSession> {
    const org = await resolveBillingOrg(userId);
    // The self-serve portal is a Stripe capability.
    const gateway = getPaymentGateway("stripe");
    return gateway.createPortalSession(org, appUrl());
}

export interface BillingStatus {
    plan: string;
    status: string | null;
    expiresAt: Date | null;
    isVerified: boolean;
    latestSubscription: {
        provider: string;
        plan: string;
        status: string;
        currentPeriodEnd: Date;
    } | null;
}

export async function getBillingStatus(userId: string): Promise<BillingStatus> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeOrganizationId: true },
    });
    if (!user?.activeOrganizationId) {
        throw new BillingError(400, "No active organization");
    }

    const orgId = user.activeOrganizationId;

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
            subscriptionPlan: true,
            subscriptionStatus: true,
            subscriptionExpiresAt: true,
            isVerified: true,
        },
    });
    if (!org) {
        throw new BillingError(404, "Organization not found");
    }

    const latestSub = await prisma.orgSubscription.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        select: { provider: true, plan: true, status: true, currentPeriodEnd: true },
    });

    return {
        plan: org.subscriptionPlan,
        status: org.subscriptionStatus,
        expiresAt: org.subscriptionExpiresAt,
        isVerified: org.isVerified,
        latestSubscription: latestSub ?? null,
    };
}
