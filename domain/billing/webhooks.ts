/**
 * domain/billing/webhooks.ts
 *
 * Shared, provider-agnostic processing of normalized billing events. Both the
 * Stripe and Razorpay webhook routes verify+normalize via their adapter, then
 * dispatch here — so subscription lifecycle logic lives exactly once.
 */

import { prisma } from "@/lib/db";
import { PLAN_API_LIMITS } from "@/constants";
import { syncCredentialTier, ensureCredential } from "@/domain/api-credentials";
import type { Prisma, PaymentProvider as DbPaymentProvider } from "@prisma/client";
import type { NormalizedBillingEvent, PaymentProvider } from "./gateway/types";

function toDbProvider(provider: PaymentProvider): DbPaymentProvider {
    return provider === "stripe" ? "STRIPE" : "RAZORPAY";
}

/**
 * Applies a single normalized billing event. Idempotent per provider event id
 * where the underlying operations are (upserts / status updates).
 */
export async function handleBillingEvent(event: NormalizedBillingEvent): Promise<void> {
    switch (event.kind) {
        case "subscription.activated":
            await activateSubscription(event);
            break;
        case "subscription.renewed":
            await renewSubscription(event);
            break;
        case "subscription.payment_failed":
            await markSubscriptionPastDue(event.providerSubscriptionId);
            break;
        case "subscription.cancelled":
            await cancelSubscription(event.providerSubscriptionId);
            break;
        case "event_payment.succeeded":
            await confirmEventPayment(event);
            break;
        case "ignored":
            break;
    }
}

async function activateSubscription(
    event: Extract<NormalizedBillingEvent, { kind: "subscription.activated" }>
): Promise<void> {
    const { orgId, plan, providerSubscriptionId, currentPeriodStart, currentPeriodEnd } = event;
    const usageLimit = PLAN_API_LIMITS[plan] ?? PLAN_API_LIMITS.FREE;

    await prisma.$transaction(async (tx) => {
        await tx.organization.update({
            where: { id: orgId },
            data: {
                subscriptionPlan: plan,
                subscriptionStatus: "ACTIVE",
                subscriptionExpiresAt: currentPeriodEnd,
            },
        });

        await tx.orgSubscription.upsert({
            where: { providerSubscriptionId },
            create: {
                organizationId: orgId,
                provider: toDbProvider(event.provider),
                providerSubscriptionId,
                plan,
                status: "ACTIVE",
                currentPeriodStart,
                currentPeriodEnd,
            },
            update: { plan, status: "ACTIVE", currentPeriodStart, currentPeriodEnd },
        });

        await ensureCredential(orgId, plan, usageLimit, tx);
    });

    console.log(`[billing] ✓ Activated ${plan} for org ${orgId} (API limit → ${usageLimit})`);
}

async function renewSubscription(
    event: Extract<NormalizedBillingEvent, { kind: "subscription.renewed" }>
): Promise<void> {
    const { providerSubscriptionId, currentPeriodStart, currentPeriodEnd } = event;

    const orgSub = await prisma.orgSubscription.findUnique({
        where: { providerSubscriptionId },
    });
    if (!orgSub) return;

    await prisma.$transaction([
        prisma.orgSubscription.update({
            where: { providerSubscriptionId },
            data: { status: "ACTIVE", currentPeriodStart, currentPeriodEnd },
        }),
        prisma.organization.update({
            where: { id: orgSub.organizationId },
            data: { subscriptionStatus: "ACTIVE", subscriptionExpiresAt: currentPeriodEnd },
        }),
    ]);
}

async function markSubscriptionPastDue(providerSubscriptionId: string): Promise<void> {
    const orgSub = await prisma.orgSubscription.findUnique({
        where: { providerSubscriptionId },
    });
    if (!orgSub) return;

    await prisma.$transaction([
        prisma.orgSubscription.update({
            where: { providerSubscriptionId },
            data: { status: "PAST_DUE" },
        }),
        prisma.organization.update({
            where: { id: orgSub.organizationId },
            data: { subscriptionStatus: "PAST_DUE" },
        }),
    ]);

    console.warn(`[billing] ⚠ Invoice payment failed for org ${orgSub.organizationId}`);
}

async function cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const orgSub = await prisma.orgSubscription.findUnique({
        where: { providerSubscriptionId },
    });
    if (!orgSub) return;

    await prisma.$transaction(async (tx) => {
        await tx.orgSubscription.update({
            where: { providerSubscriptionId },
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
        await syncCredentialTier(
            {
                organizationId: orgSub.organizationId,
                tier: "FREE",
                usageLimit: PLAN_API_LIMITS.FREE,
            },
            tx
        );
    });

    console.log(`[billing] ✓ Downgraded org ${orgSub.organizationId} to FREE`);
}

async function confirmEventPayment(
    event: Extract<NormalizedBillingEvent, { kind: "event_payment.succeeded" }>
): Promise<void> {
    const eventPayment = await prisma.eventPayment.findFirst({
        where: event.findBy,
        include: {
            participation: { include: { event: { include: { organization: true } } } },
        },
    });

    if (!eventPayment) {
        if (event.markSucceededIfMissing) {
            await prisma.eventPayment.updateMany({
                where: { participationId: event.participationId },
                data: {
                    status: "SUCCEEDED",
                    ...(event.receiptUrl !== undefined ? { receiptUrl: event.receiptUrl } : {}),
                },
            });
        }
        return;
    }

    const { participation } = eventPayment;

    await prisma.$transaction([
        prisma.eventPayment.update({
            where: { id: eventPayment.id },
            data: {
                status: "SUCCEEDED",
                ...(event.updateProviderPaymentId
                    ? { providerPaymentId: event.updateProviderPaymentId }
                    : {}),
                ...(event.receiptUrl !== undefined ? { receiptUrl: event.receiptUrl } : {}),
            },
        }),
        prisma.eventParticipation.update({
            where: { id: event.participationId },
            data: { isPaid: true, status: "REGISTERED" },
        }),
    ]);

    const org = participation.event.organization;
    const orgId = participation.event.organizationId;

    const jobs: Prisma.JobQueueCreateManyInput[] = [
        {
            type: "SEND_PAYMENT_RECEIPT",
            payload: {
                participationId: event.participationId,
                eventId: eventPayment.eventId,
                userId: participation.userId,
                amount: eventPayment.amount,
                currency: eventPayment.currency,
            },
        },
    ];

    if (orgId && org?.paymentWebhookUrl) {
        let orgApiKey: string | null = null;
        if (event.attachOrgApiKey) {
            const cred = await prisma.apiCredential.findFirst({
                where: { organizationId: orgId, status: "ACTIVE" },
                select: { apiKey: true },
            });
            orgApiKey = cred?.apiKey ?? null;
        }

        jobs.push({
            type: "ORG_WEBHOOK_DELIVERY",
            payload: {
                eventId: eventPayment.eventId,
                participationId: event.participationId,
                amount: eventPayment.amount,
                currency: eventPayment.currency,
                payerUserId: participation.userId,
                payerOrgId: participation.organizationId ?? null,
                webhookUrl: org.paymentWebhookUrl,
                orgApiKey,
            },
        });
    }

    await prisma.jobQueue.createMany({ data: jobs });

    console.log(`[billing] ✓ Payment confirmed for participation ${event.participationId}`);
}
