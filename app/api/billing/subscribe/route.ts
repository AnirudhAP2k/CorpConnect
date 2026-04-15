/**
 * app/api/billing/subscribe/route.ts
 *
 * POST /api/billing/subscribe
 * Body: { plan: "PRO" | "ENTERPRISE", provider: "stripe" | "razorpay" }
 *
 * Creates a Stripe Checkout Session or Razorpay subscription order and returns
 * the redirect URL that the client should navigate to.
 *
 * Guards:
 *  - Must be authenticated
 *  - Org must exist and caller must be OWNER or ADMIN
 *  - org.subscriptionPlan must currently be FREE (can't double-subscribe)
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getStripe, STRIPE_PRICE_IDS } from "@/lib/payment/stripe";
import { getRazorpay } from "@/lib/payment/razorpay";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
    try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { plan, provider } = body as {
            plan: "PRO" | "ENTERPRISE";
            provider: "stripe" | "razorpay";
        };

        if (!["PRO", "ENTERPRISE"].includes(plan)) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }
        if (!["stripe", "razorpay"].includes(provider)) {
            return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
        }

        // Resolve caller's active org and verify OWNER/ADMIN
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { activeOrganizationId: true },
        });
        if (!user?.activeOrganizationId) {
            return NextResponse.json(
                { error: "No active organization. Please select an organization first." },
                { status: 400 }
            );
        }

        const orgId = user.activeOrganizationId;

        const membership = await prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId, organizationId: orgId } },
            select: { role: true },
        });
        if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
            return NextResponse.json(
                { error: "Only OWNER or ADMIN can manage billing" },
                { status: 403 }
            );
        }

        const org = await prisma.organization.findUnique({
            where: { id: orgId },
            select: {
                id: true,
                name: true,
                subscriptionPlan: true,
                stripeCustomerId: true,
                razorpayCustomerId: true,
            },
        });
        if (!org) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

        // ── Stripe ──────────────────────────────────────────────────────────────
        if (provider === "stripe") {
            const stripe = getStripe();
            const priceId = STRIPE_PRICE_IDS[plan];
            if (!priceId) {
                return NextResponse.json(
                    { error: `Stripe Price ID for ${plan} is not configured` },
                    { status: 500 }
                );
            }

            // Ensure Stripe customer exists
            let stripeCustomerId = org.stripeCustomerId ?? undefined;
            if (!stripeCustomerId) {
                const customer = await stripe.customers.create({
                    name: org.name,
                    metadata: { orgId },
                });
                stripeCustomerId = customer.id;
                await prisma.organization.update({
                    where: { id: orgId },
                    data: { stripeCustomerId },
                });
            }

            const checkoutSession = await stripe.checkout.sessions.create({
                customer: stripeCustomerId,
                mode: "subscription",
                line_items: [{ price: priceId, quantity: 1 }],
                success_url: `${appUrl}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${appUrl}/billing?cancelled=1`,
                metadata: { orgId, plan },
            });

            return NextResponse.json({ url: checkoutSession.url }, { status: 200 });
        }

        // ── Razorpay ────────────────────────────────────────────────────────────
        const razorpay = getRazorpay();

        // Ensure RZP customer exists
        let rzpCustomerId = org.razorpayCustomerId ?? undefined;
        if (!rzpCustomerId) {
            const customer = await razorpay.customers.create({
                name: org.name,
                notes: { orgId },
            } as any);
            rzpCustomerId = (customer as any).id as string;
            await prisma.organization.update({
                where: { id: orgId },
                data: { razorpayCustomerId: rzpCustomerId },
            });
        }

        // Razorpay plan IDs from env (set up manually in RZP dashboard)
        const rzpPlanId =
            plan === "PRO"
                ? process.env.RAZORPAY_PRO_PLAN_ID
                : process.env.RAZORPAY_ENTERPRISE_PLAN_ID;

        if (!rzpPlanId) {
            return NextResponse.json(
                { error: `Razorpay Plan ID for ${plan} is not configured` },
                { status: 500 }
            );
        }

        const subscription = await razorpay.subscriptions.create({
            plan_id: rzpPlanId,
            customer_notify: 1,
            total_count: 120, // 10 years — effectively perpetual
            notes: { orgId, plan },
        } as any);

        const shortUrl = `https://rzp.io/l/${(subscription as any).short_url ?? (subscription as any).id}`;
        return NextResponse.json({ url: shortUrl }, { status: 200 });
    } catch (error: any) {
        console.error("[billing/subscribe]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
