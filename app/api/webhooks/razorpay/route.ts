/**
 * app/api/webhooks/razorpay/route.ts
 *
 * Razorpay webhook handler. Verifies HMAC-SHA256 signature.
 *
 * Events handled:
 *  subscription.activated   → activate PRO/ENTERPRISE
 *  subscription.cancelled   → downgrade to FREE
 *  payment.captured         → confirm event registration payment
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHmac } from "crypto";
import { PLAN_API_LIMITS } from "@/constants";

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

function verifySignature(body: string, signature: string): boolean {
    const expected = createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest("hex");
    return expected === signature;
}

export const POST = async (req: NextRequest) => {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";

    if (!verifySignature(rawBody, signature)) {
        console.error("[rzp-webhook] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    let event: { event: string; payload: any };
    try {
        event = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log(`[rzp-webhook] Received: ${event.event}`);

    try {
        switch (event.event) {
            case "subscription.activated":
                await handleSubscriptionActivated(event.payload);
                break;

            case "subscription.cancelled":
                await handleSubscriptionCancelled(event.payload);
                break;

            case "payment.captured":
                await handlePaymentCaptured(event.payload);
                break;

            default:
                break;
        }
    } catch (err: any) {
        console.error(`[rzp-webhook] Error handling ${event.event}:`, err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
};

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleSubscriptionActivated(payload: any) {
    const rzpSub = payload.subscription?.entity;
    const notes = rzpSub?.notes ?? {};
    const orgId = notes.orgId as string | undefined;
    const plan = notes.plan as "PRO" | "ENTERPRISE" | undefined;
    if (!orgId || !plan) return;

    const currentPeriodStart = new Date(rzpSub.current_start * 1000);
    const currentPeriodEnd = new Date(rzpSub.current_end * 1000);
    const usageLimit = PLAN_API_LIMITS[plan] ?? PLAN_API_LIMITS.FREE;

    await prisma.$transaction(async (tx) => {
        // 1. Upgrade org subscription fields
        await tx.organization.update({
            where: { id: orgId },
            data: {
                subscriptionPlan: plan,
                subscriptionStatus: "ACTIVE",
                subscriptionExpiresAt: currentPeriodEnd,
            },
        });

        // 2. Record subscription history
        await tx.orgSubscription.upsert({
            where: { providerSubscriptionId: rzpSub.id },
            create: {
                organizationId: orgId,
                provider: "RAZORPAY",
                providerSubscriptionId: rzpSub.id,
                plan,
                status: "ACTIVE",
                currentPeriodStart,
                currentPeriodEnd,
            },
            update: { plan, status: "ACTIVE", currentPeriodStart, currentPeriodEnd },
        });

        // 3. Sync ApiCredential tier + usageLimit (if credential exists)
        const existing = await tx.apiCredential.findUnique({
            where: { organizationId: orgId },
        });
        if (existing) {
            await tx.apiCredential.update({
                where: { organizationId: orgId },
                data: { tier: plan, usageLimit },
            });
        }
    });

    console.log(`[rzp-webhook] ✓ Activated ${plan} for org ${orgId} (API limit → ${usageLimit})`);
}

async function handleSubscriptionCancelled(payload: any) {
    const rzpSub = payload.subscription?.entity;
    if (!rzpSub?.id) return;

    const orgSub = await prisma.orgSubscription.findUnique({
        where: { providerSubscriptionId: rzpSub.id },
    });
    if (!orgSub) return;

    await prisma.$transaction(async (tx) => {
        await tx.orgSubscription.update({
            where: { providerSubscriptionId: rzpSub.id },
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

    console.log(`[rzp-webhook] ✓ Downgraded org ${orgSub.organizationId} to FREE`);
}

async function handlePaymentCaptured(payload: any) {
    const rzpPayment = payload.payment?.entity;
    if (!rzpPayment?.id) return;

    const participationId = rzpPayment.notes?.participationId as string | undefined;
    if (!participationId) return;

    const orderId = rzpPayment.order_id as string | undefined;
    if (!orderId) return;

    const eventPayment = await prisma.eventPayment.findFirst({
        where: { providerPaymentId: orderId },
        include: {
            participation: { include: { event: { include: { organization: true } } } },
        },
    });

    if (!eventPayment) return;

    await prisma.$transaction([
        prisma.eventPayment.update({
            where: { id: eventPayment.id },
            data: {
                status: "SUCCEEDED",
                providerPaymentId: rzpPayment.id,
            },
        }),
        prisma.eventParticipation.update({
            where: { id: participationId },
            data: { isPaid: true, status: "REGISTERED" },
        }),
    ]);

    const org = eventPayment.participation.event.organization;
    const jobs: any[] = [
        {
            type: "SEND_PAYMENT_RECEIPT",
            payload: {
                participationId,
                eventId: eventPayment.eventId,
                userId: eventPayment.participation.userId,
                amount: eventPayment.amount,
                currency: eventPayment.currency,
            },
        },
    ];

    if (org?.paymentWebhookUrl) {
        jobs.push({
            type: "ORG_WEBHOOK_DELIVERY",
            payload: {
                eventId: eventPayment.eventId,
                participationId,
                amount: eventPayment.amount,
                currency: eventPayment.currency,
                payerUserId: eventPayment.participation.userId,
                payerOrgId: eventPayment.participation.organizationId ?? null,
                webhookUrl: org.paymentWebhookUrl,
                orgApiKey: null,
            },
        });
    }

    await prisma.jobQueue.createMany({ data: jobs });

    console.log(`[rzp-webhook] ✓ Payment captured for participation ${participationId}`);
}
