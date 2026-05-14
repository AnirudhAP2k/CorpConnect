/**
 * app/api/billing/portal/route.ts
 *
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session so the org can self-serve
 * plan management (upgrade / downgrade / cancel).
 *
 * Returns: { url: string }
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/payment/stripe";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
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

        const membership = await prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId, organizationId: orgId } },
            select: { role: true },
        });
        if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { stripeCustomerId: true },
        });

        if (!org?.stripeCustomerId) {
            return NextResponse.json(
                { error: "No Stripe subscription found. Please subscribe first." },
                { status: 400 }
            );
        }

        const stripe = getStripe();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: org.stripeCustomerId,
            return_url: `${appUrl}/billing`,
        });

        return NextResponse.json({ url: portalSession.url }, { status: 200 });
    } catch (error: any) {
        console.error("[billing/portal]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
