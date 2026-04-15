/**
 * app/api/events/[id]/checkout/route.ts
 *
 * POST /api/events/[id]/checkout
 * Body: { provider: "stripe" | "razorpay" }
 *
 * Creates a payment session for a PLATFORM-mode paid event.
 * Returns:
 *   { mode: "free" }                           — event is free
 *   { mode: "external", url: string }          — EXTERNAL mode, redirect org link
 *   { mode: "platform", url: string }          — Stripe/RZP checkout URL
 *
 * Abuse-prevention Layer 1 enforced here: FREE tier orgs cannot access this route
 * for PLATFORM events (enforced in participate route).
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getStripe, PLATFORM_FEE_PERCENT } from "@/lib/payment/stripe";
import { getRazorpay } from "@/lib/payment/razorpay";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: eventId } = await params;

        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const provider = (body.provider ?? "stripe") as "stripe" | "razorpay";

        const event = await prisma.events.findUnique({
            where: { id: eventId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        subscriptionPlan: true,
                        isVerified: true,
                        stripeCustomerId: true,
                    },
                },
            },
        });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // FREE event — nothing to pay
        if (event.paymentMode === "FREE") {
            return NextResponse.json({ mode: "free" }, { status: 200 });
        }

        // EXTERNAL event — return org's payment link
        if (event.paymentMode === "EXTERNAL") {
            return NextResponse.json(
                { mode: "external", url: event.externalPayUrl ?? null },
                { status: 200 }
            );
        }

        // PLATFORM event — create checkout
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { activeOrganizationId: true },
        });

        // Check for existing participation
        const existing = await prisma.eventParticipation.findUnique({
            where: { eventId_userId: { eventId, userId } },
        });

        const participationId =
            existing?.id ??
            (
                await prisma.eventParticipation.create({
                    data: {
                        eventId,
                        userId,
                        organizationId: user?.activeOrganizationId ?? null,
                        status: "PENDING_PAYMENT",
                        isPaid: false,
                    },
                })
            ).id;

        // Parse amount (price is stored as string like "2999" or "29.99")
        const amountPaise = Math.round(parseFloat(event.price ?? "0") * 100);
        const currency = event.currency ?? "INR";
        const orgPlan = event.organization?.subscriptionPlan ?? "FREE";
        const feePercent =
            orgPlan === "ENTERPRISE"
                ? PLATFORM_FEE_PERCENT.ENTERPRISE
                : PLATFORM_FEE_PERCENT.PRO;
        const platformFee = Math.round(amountPaise * feePercent);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

        // ── Stripe ──────────────────────────────────────────────────────────────
        if (provider === "stripe") {
            const stripe = getStripe();

            const checkoutSession = await stripe.checkout.sessions.create({
                mode: "payment",
                line_items: [
                    {
                        price_data: {
                            currency: currency.toLowerCase(),
                            product_data: { name: event.title },
                            unit_amount: amountPaise,
                        },
                        quantity: 1,
                    },
                ],
                payment_intent_data: {
                    application_fee_amount: platformFee,
                    metadata: { participationId, eventId, userId },
                },
                success_url: `${appUrl}/events/${eventId}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${appUrl}/events/${eventId}`,
                metadata: { participationId, eventId, userId },
            });

            // Create pending EventPayment record
            await prisma.eventPayment.upsert({
                where: { participationId },
                create: {
                    participationId,
                    eventId,
                    provider: "STRIPE",
                    providerPaymentId: checkoutSession.payment_intent as string ?? checkoutSession.id,
                    amount: amountPaise,
                    currency,
                    status: "PENDING",
                },
                update: { status: "PENDING" },
            });

            return NextResponse.json(
                { mode: "platform", url: checkoutSession.url },
                { status: 200 }
            );
        }

        // ── Razorpay ────────────────────────────────────────────────────────────
        const razorpay = getRazorpay();

        const order = await razorpay.orders.create({
            amount: amountPaise,
            currency,
            notes: {
                participationId,
                eventId,
                userId,
            },
        } as any);

        // Create pending EventPayment record
        await prisma.eventPayment.upsert({
            where: { participationId },
            create: {
                participationId,
                eventId,
                provider: "RAZORPAY",
                providerPaymentId: (order as any).id,
                amount: amountPaise,
                currency,
                status: "PENDING",
            },
            update: { status: "PENDING" },
        });

        return NextResponse.json(
            {
                mode: "platform",
                provider: "razorpay",
                orderId: (order as any).id,
                amount: amountPaise,
                currency,
                keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                prefill: { name: "", email: "" },
                eventTitle: event.title,
                callbackUrl: `${appUrl}/events/${eventId}/payment-success`,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("[checkout]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
