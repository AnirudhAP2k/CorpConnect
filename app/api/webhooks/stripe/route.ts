/**
 * app/api/webhooks/stripe/route.ts
 *
 * Stripe webhook handler. Verifies signature, dispatches each event type.
 *
 * Events handled:
 *  checkout.session.completed       → activate PRO/ENTERPRISE subscription
 *  invoice.payment_succeeded        → renew / confirm subscription active
 *  invoice.payment_failed           → mark PAST_DUE, log warning
 *  customer.subscription.deleted   → downgrade org to FREE
 *  payment_intent.succeeded         → confirm event registration + enqueue receipt + org webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/payment/stripe";
import type { SubscriptionPlan } from "@prisma/client";
import { PLAN_API_LIMITS } from "@/constants";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

export const POST = async (req: NextRequest) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const rawBody = await req.text();
    const sig = req.headers.get("stripe-signature") ?? "";

    let event: ReturnType<typeof stripe.webhooks.constructEvent>;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
        console.error("[stripe-webhook] Invalid signature:", err.message);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`[stripe-webhook] Received: ${event.type}`);

    try {
        switch (event.type) {
            case "checkout.session.completed":
                await handleCheckoutCompleted(event.data.object);
                break;

            case "invoice.payment_succeeded":
                await handleInvoicePaymentSucceeded(event.data.object);
                break;

            case "invoice.payment_failed":
                await handleInvoicePaymentFailed(event.data.object);
                break;

            case "customer.subscription.deleted":
                await handleSubscriptionDeleted(event.data.object);
                break;

            case "payment_intent.succeeded":
                await handlePaymentIntentSucceeded(event.data.object);
                break;

            default:
                // Acknowledge but don't process unknown events
                break;
        }
    } catch (err: any) {
        console.error(`[stripe-webhook] Error handling ${event.type}:`, err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
};

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: any) {
    const orgId = session.metadata?.orgId as string | undefined;
    const plan = session.metadata?.plan as SubscriptionPlan | undefined;
    const subscriptionId = session.subscription as string | undefined;

    if (!orgId || !plan || !subscriptionId) return;

    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;
    const usageLimit = PLAN_API_LIMITS[plan] ?? PLAN_API_LIMITS.FREE;

    console.log(`[stripe-webhook] Retrieved subscription ${subscriptionId}`);

    const periodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000) : new Date();
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
        await tx.organization.update({
            where: { id: orgId },
            data: {
                subscriptionPlan: plan,
                subscriptionStatus: "ACTIVE",
                subscriptionExpiresAt: periodEnd,
            },
        });
        await tx.orgSubscription.upsert({
            where: { providerSubscriptionId: subscriptionId },
            create: {
                organizationId: orgId,
                provider: "STRIPE",
                providerSubscriptionId: subscriptionId,
                plan,
                status: "ACTIVE",
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
            },
            update: {
                plan,
                status: "ACTIVE",
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
            },
        });
        // Sync ApiCredential tier + limits
        const existing = await tx.apiCredential.findUnique({ where: { organizationId: orgId } });
        if (existing) {
            await tx.apiCredential.update({
                where: { organizationId: orgId },
                data: { tier: plan, usageLimit },
            });
        } else {
            const rawKey = `evtly_live_${randomBytes(24).toString("hex")}`;
            const prefix = rawKey.slice(0, 18);
            const hashed = await bcrypt.hash(rawKey, 12);

            await prisma.apiCredential.upsert({
                where: { organizationId: orgId },
                update: {
                    apiKey: hashed,
                    apiKeyPrefix: prefix,
                    tier: plan,
                    usageLimit,
                    usageCount: 0,
                },
                create: {
                    organizationId: orgId,
                    apiKey: hashed,
                    apiKeyPrefix: prefix,
                    tier: plan,
                    usageLimit,
                },
            });
        }
    });

    console.log(`[stripe-webhook] ✓ Activated ${plan} for org ${orgId} (API limit → ${usageLimit})`);
}

async function handleInvoicePaymentSucceeded(invoice: any) {
    const subscriptionId = invoice.subscription as string | undefined;
    if (!subscriptionId) return;

    const stripe = getStripe();
    const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as any;
    const orgSub = await prisma.orgSubscription.findUnique({
        where: { providerSubscriptionId: subscriptionId },
    });
    if (!orgSub) return;

    const periodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000) : new Date();
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
        prisma.orgSubscription.update({
            where: { providerSubscriptionId: subscriptionId },
            data: {
                status: "ACTIVE",
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
            },
        }),
        prisma.organization.update({
            where: { id: orgSub.organizationId },
            data: {
                subscriptionStatus: "ACTIVE",
                subscriptionExpiresAt: periodEnd,
            },
        }),
    ]);
}

async function handleInvoicePaymentFailed(invoice: any) {
    const subscriptionId = invoice.subscription as string | undefined;
    if (!subscriptionId) return;

    const orgSub = await prisma.orgSubscription.findUnique({
        where: { providerSubscriptionId: subscriptionId },
    });
    if (!orgSub) return;

    await prisma.$transaction([
        prisma.orgSubscription.update({
            where: { providerSubscriptionId: subscriptionId },
            data: { status: "PAST_DUE" },
        }),
        prisma.organization.update({
            where: { id: orgSub.organizationId },
            data: { subscriptionStatus: "PAST_DUE" },
        }),
    ]);

    console.warn(`[stripe-webhook] ⚠ Invoice payment failed for org ${orgSub.organizationId}`);
}

async function handleSubscriptionDeleted(subscription: any) {
    const orgSub = await prisma.orgSubscription.findUnique({
        where: { providerSubscriptionId: subscription.id },
    });
    if (!orgSub) return;

    await prisma.$transaction(async (tx) => {
        await tx.orgSubscription.update({
            where: { providerSubscriptionId: subscription.id },
            data: { status: "CANCELLED", cancelledAt: new Date() },
        });
        await tx.organization.update({
            where: { id: orgSub.organizationId },
            data: {
                subscriptionPlan: "FREE",
                subscriptionStatus: "CANCELLED",
                subscriptionExpiresAt: null,
            },
        });
        // Downgrade ApiCredential back to FREE limits
        const existing = await tx.apiCredential.findUnique({
            where: { organizationId: orgSub.organizationId },
        });
        if (existing) {
            await tx.apiCredential.update({
                where: { organizationId: orgSub.organizationId },
                data: { tier: "FREE", usageLimit: PLAN_API_LIMITS.FREE },
            });
        }
    });

    console.log(`[stripe-webhook] ✓ Downgraded org ${orgSub.organizationId} to FREE`);
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
    const participationId = paymentIntent.metadata?.participationId as string | undefined;
    if (!participationId) return; // Not an event payment

    const eventPayment = await prisma.eventPayment.findFirst({
        where: { providerPaymentId: paymentIntent.id },
        include: {
            participation: {
                include: {
                    event: {
                        include: {
                            organization: {
                                include: { apiCredential: true },
                            },
                        },
                    },
                    user: true,
                },
            },
        },
    });

    if (!eventPayment) {
        // Payment was recorded optimistically at checkout — update status
        await prisma.eventPayment.updateMany({
            where: { providerPaymentId: paymentIntent.id },
            data: { status: "SUCCEEDED", receiptUrl: paymentIntent.charges?.data?.[0]?.receipt_url },
        });
        return;
    }

    const { participation } = eventPayment;

    await prisma.$transaction([
        prisma.eventPayment.update({
            where: { id: eventPayment.id },
            data: {
                status: "SUCCEEDED",
                receiptUrl:
                    (paymentIntent as any).charges?.data?.[0]?.receipt_url ?? null,
            },
        }),
        prisma.eventParticipation.update({
            where: { id: participationId },
            data: { isPaid: true, status: "REGISTERED" },
        }),
    ]);

    // Enqueue async post-payment jobs (fire-and-forget)
    const orgId = participation.event.organizationId;
    const jobs: any[] = [
        {
            type: "SEND_PAYMENT_RECEIPT",
            payload: {
                participationId,
                eventId: participation.eventId,
                userId: participation.userId,
                amount: eventPayment.amount,
                currency: eventPayment.currency,
            },
        },
    ];

    if (orgId && participation.event.organization?.paymentWebhookUrl) {
        jobs.push({
            type: "ORG_WEBHOOK_DELIVERY",
            payload: {
                eventId: participation.eventId,
                participationId,
                amount: eventPayment.amount,
                currency: eventPayment.currency,
                payerUserId: participation.userId,
                payerOrgId: participation.organizationId ?? null,
                webhookUrl: participation.event.organization.paymentWebhookUrl,
                orgApiKey: participation.event.organization?.apiCredential?.apiKey ?? null,
            },
        });
    }

    await prisma.jobQueue.createMany({ data: jobs });

    console.log(`[stripe-webhook] ✓ Payment confirmed for participation ${participationId}`);
}
