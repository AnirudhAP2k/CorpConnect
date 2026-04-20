/**
 * app/api/billing/status/route.ts
 *
 * GET /api/billing/status
 *
 * Returns the current subscription state of the caller's active org.
 * Used by the billing page and feature-gating checks.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { activeOrganizationId: true },
        });
        if (!user?.activeOrganizationId) {
            return NextResponse.json({ error: "No active organization" }, { status: 400 });
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
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        // Latest active subscription record (if any)
        const latestSub = await prisma.orgSubscription.findFirst({
            where: { organizationId: orgId },
            orderBy: { createdAt: "desc" },
            select: {
                provider: true,
                plan: true,
                status: true,
                currentPeriodEnd: true,
            },
        });

        return NextResponse.json(
            {
                plan: org.subscriptionPlan,
                status: org.subscriptionStatus,
                expiresAt: org.subscriptionExpiresAt,
                isVerified: org.isVerified,
                latestSubscription: latestSub ?? null,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("[billing/status]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
