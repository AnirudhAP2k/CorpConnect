/**
 * Tests for domain/billing/webhooks.ts (handleBillingEvent)
 *
 * Covers the full subscription lifecycle (activate, renew, past-due, cancel)
 * and event payment confirmation — the provider-agnostic core that both the
 * Stripe and Razorpay webhook routes dispatch into.
 */

import { handleBillingEvent } from "@/domain/billing/webhooks";
import { prisma } from "@/lib/db";
import { ensureCredential, syncCredentialTier } from "@/domain/api-credentials";
import { PLAN_API_LIMITS } from "@/constants";
import type { NormalizedBillingEvent } from "@/domain/billing/gateway/types";

jest.mock("@/lib/db", () => {
    const prismaMock: Record<string, any> = {
        organization: { update: jest.fn() },
        orgSubscription: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
        eventPayment: { findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
        eventParticipation: { update: jest.fn() },
        apiCredential: { findFirst: jest.fn() },
        jobQueue: { createMany: jest.fn() },
    };
    // Support both interactive ($transaction(fn)) and batch ($transaction([...])) forms.
    prismaMock.$transaction = jest.fn(async (arg: any) =>
        typeof arg === "function" ? arg(prismaMock) : Promise.all(arg)
    );
    return { prisma: prismaMock };
});

jest.mock("@/domain/api-credentials", () => ({
    ensureCredential: jest.fn(),
    syncCredentialTier: jest.fn(),
}));

const ORG_ID = "22222222-2222-4222-8222-222222222222";
const SUB_ID = "sub_provider_123";
const PARTICIPATION_ID = "33333333-3333-4333-8333-333333333333";

describe("handleBillingEvent", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("subscription.activated", () => {
        const activatedEvent: NormalizedBillingEvent = {
            kind: "subscription.activated",
            provider: "razorpay",
            orgId: ORG_ID,
            plan: "ENTERPRISE",
            providerSubscriptionId: SUB_ID,
            currentPeriodStart: new Date("2026-07-01T00:00:00Z"),
            currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
        };

        it("upgrades the org, upserts the subscription, and provisions API credentials", async () => {
            await handleBillingEvent(activatedEvent);

            expect(prisma.organization.update).toHaveBeenCalledWith({
                where: { id: ORG_ID },
                data: {
                    subscriptionPlan: "ENTERPRISE",
                    subscriptionStatus: "ACTIVE",
                    subscriptionExpiresAt: activatedEvent.currentPeriodEnd,
                },
            });

            expect(prisma.orgSubscription.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { providerSubscriptionId: SUB_ID },
                    create: expect.objectContaining({
                        organizationId: ORG_ID,
                        provider: "RAZORPAY",
                        plan: "ENTERPRISE",
                        status: "ACTIVE",
                    }),
                    update: expect.objectContaining({ plan: "ENTERPRISE", status: "ACTIVE" }),
                })
            );

            expect(ensureCredential).toHaveBeenCalledWith(
                ORG_ID,
                "ENTERPRISE",
                PLAN_API_LIMITS.ENTERPRISE,
                expect.anything()
            );
        });

        it("maps the stripe provider to the STRIPE db enum", async () => {
            await handleBillingEvent({ ...activatedEvent, provider: "stripe" });

            expect(prisma.orgSubscription.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    create: expect.objectContaining({ provider: "STRIPE" }),
                })
            );
        });
    });

    describe("subscription.renewed", () => {
        const renewedEvent: NormalizedBillingEvent = {
            kind: "subscription.renewed",
            providerSubscriptionId: SUB_ID,
            currentPeriodStart: new Date("2026-08-01T00:00:00Z"),
            currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
        };

        it("does nothing when the subscription is unknown", async () => {
            (prisma.orgSubscription.findUnique as jest.Mock).mockResolvedValue(null);

            await handleBillingEvent(renewedEvent);

            expect(prisma.orgSubscription.update).not.toHaveBeenCalled();
            expect(prisma.organization.update).not.toHaveBeenCalled();
        });

        it("extends the period and re-activates the org", async () => {
            (prisma.orgSubscription.findUnique as jest.Mock).mockResolvedValue({
                organizationId: ORG_ID,
            });

            await handleBillingEvent(renewedEvent);

            expect(prisma.orgSubscription.update).toHaveBeenCalledWith({
                where: { providerSubscriptionId: SUB_ID },
                data: {
                    status: "ACTIVE",
                    currentPeriodStart: renewedEvent.currentPeriodStart,
                    currentPeriodEnd: renewedEvent.currentPeriodEnd,
                },
            });
            expect(prisma.organization.update).toHaveBeenCalledWith({
                where: { id: ORG_ID },
                data: {
                    subscriptionStatus: "ACTIVE",
                    subscriptionExpiresAt: renewedEvent.currentPeriodEnd,
                },
            });
        });
    });

    describe("subscription.payment_failed", () => {
        it("marks the subscription and org as PAST_DUE", async () => {
            (prisma.orgSubscription.findUnique as jest.Mock).mockResolvedValue({
                organizationId: ORG_ID,
            });

            await handleBillingEvent({
                kind: "subscription.payment_failed",
                providerSubscriptionId: SUB_ID,
            });

            expect(prisma.orgSubscription.update).toHaveBeenCalledWith({
                where: { providerSubscriptionId: SUB_ID },
                data: { status: "PAST_DUE" },
            });
            expect(prisma.organization.update).toHaveBeenCalledWith({
                where: { id: ORG_ID },
                data: { subscriptionStatus: "PAST_DUE" },
            });
        });

        it("ignores failures for unknown subscriptions", async () => {
            (prisma.orgSubscription.findUnique as jest.Mock).mockResolvedValue(null);

            await handleBillingEvent({
                kind: "subscription.payment_failed",
                providerSubscriptionId: "sub_unknown",
            });

            expect(prisma.orgSubscription.update).not.toHaveBeenCalled();
        });
    });

    describe("subscription.cancelled", () => {
        it("downgrades the org to FREE and syncs the API credential tier", async () => {
            (prisma.orgSubscription.findUnique as jest.Mock).mockResolvedValue({
                organizationId: ORG_ID,
            });

            await handleBillingEvent({
                kind: "subscription.cancelled",
                providerSubscriptionId: SUB_ID,
            });

            expect(prisma.orgSubscription.update).toHaveBeenCalledWith({
                where: { providerSubscriptionId: SUB_ID },
                data: expect.objectContaining({ status: "CANCELLED" }),
            });
            expect(prisma.organization.update).toHaveBeenCalledWith({
                where: { id: ORG_ID },
                data: {
                    subscriptionPlan: "FREE",
                    subscriptionStatus: "CANCELLED",
                    subscriptionExpiresAt: null,
                },
            });
            expect(syncCredentialTier).toHaveBeenCalledWith(
                {
                    organizationId: ORG_ID,
                    tier: "FREE",
                    usageLimit: PLAN_API_LIMITS.FREE,
                },
                expect.anything()
            );
        });
    });

    describe("event_payment.succeeded", () => {
        const baseEvent: Extract<NormalizedBillingEvent, { kind: "event_payment.succeeded" }> = {
            kind: "event_payment.succeeded",
            participationId: PARTICIPATION_ID,
            findBy: { participationId: PARTICIPATION_ID },
            attachOrgApiKey: false,
            markSucceededIfMissing: false,
        };

        function mockFoundPayment(overrides: { paymentWebhookUrl?: string | null } = {}) {
            (prisma.eventPayment.findFirst as jest.Mock).mockResolvedValue({
                id: "payment-1",
                eventId: "event-1",
                amount: 500,
                currency: "INR",
                participation: {
                    userId: "user-1",
                    organizationId: null,
                    event: {
                        organizationId: ORG_ID,
                        organization: { paymentWebhookUrl: overrides.paymentWebhookUrl ?? null },
                    },
                },
            });
        }

        it("marks the payment succeeded and the participation as paid/registered", async () => {
            mockFoundPayment();
            await handleBillingEvent(baseEvent);

            expect(prisma.eventPayment.update).toHaveBeenCalledWith({
                where: { id: "payment-1" },
                data: { status: "SUCCEEDED" },
            });
            expect(prisma.eventParticipation.update).toHaveBeenCalledWith({
                where: { id: PARTICIPATION_ID },
                data: { isPaid: true, status: "REGISTERED" },
            });
        });

        it("enqueues only the receipt job when the org has no webhook URL", async () => {
            mockFoundPayment({ paymentWebhookUrl: null });
            await handleBillingEvent(baseEvent);

            const { data } = (prisma.jobQueue.createMany as jest.Mock).mock.calls[0][0];
            expect(data).toHaveLength(1);
            expect(data[0].type).toBe("SEND_PAYMENT_RECEIPT");
        });

        it("also enqueues an org webhook delivery job with the org API key attached", async () => {
            mockFoundPayment({ paymentWebhookUrl: "https://org.example/webhook" });
            (prisma.apiCredential.findFirst as jest.Mock).mockResolvedValue({ apiKey: "key-hash" });

            await handleBillingEvent({ ...baseEvent, attachOrgApiKey: true });

            expect(prisma.apiCredential.findFirst).toHaveBeenCalledWith({
                where: { organizationId: ORG_ID, status: "ACTIVE" },
                select: { apiKey: true },
            });

            const { data } = (prisma.jobQueue.createMany as jest.Mock).mock.calls[0][0];
            expect(data).toHaveLength(2);
            expect(data[1]).toMatchObject({
                type: "ORG_WEBHOOK_DELIVERY",
                payload: expect.objectContaining({
                    webhookUrl: "https://org.example/webhook",
                    orgApiKey: "key-hash",
                }),
            });
        });

        it("does not look up the API key when attachOrgApiKey is false", async () => {
            mockFoundPayment({ paymentWebhookUrl: "https://org.example/webhook" });

            await handleBillingEvent(baseEvent);

            expect(prisma.apiCredential.findFirst).not.toHaveBeenCalled();
            const { data } = (prisma.jobQueue.createMany as jest.Mock).mock.calls[0][0];
            expect(data[1].payload.orgApiKey).toBeNull();
        });

        it("falls back to updateMany when the payment row is missing and markSucceededIfMissing is set", async () => {
            (prisma.eventPayment.findFirst as jest.Mock).mockResolvedValue(null);

            await handleBillingEvent({
                ...baseEvent,
                markSucceededIfMissing: true,
                receiptUrl: "https://stripe.com/receipt",
            });

            expect(prisma.eventPayment.updateMany).toHaveBeenCalledWith({
                where: { participationId: PARTICIPATION_ID },
                data: { status: "SUCCEEDED", receiptUrl: "https://stripe.com/receipt" },
            });
            expect(prisma.eventParticipation.update).not.toHaveBeenCalled();
        });

        it("does nothing when the payment row is missing and fallback is disabled", async () => {
            (prisma.eventPayment.findFirst as jest.Mock).mockResolvedValue(null);

            await handleBillingEvent(baseEvent);

            expect(prisma.eventPayment.updateMany).not.toHaveBeenCalled();
            expect(prisma.jobQueue.createMany).not.toHaveBeenCalled();
        });

        it("persists the provider payment id when supplied (Razorpay flow)", async () => {
            mockFoundPayment();

            await handleBillingEvent({ ...baseEvent, updateProviderPaymentId: "pay_abc" });

            expect(prisma.eventPayment.update).toHaveBeenCalledWith({
                where: { id: "payment-1" },
                data: { status: "SUCCEEDED", providerPaymentId: "pay_abc" },
            });
        });
    });

    it("ignored events touch nothing", async () => {
        await handleBillingEvent({ kind: "ignored" });

        expect(prisma.$transaction).not.toHaveBeenCalled();
        expect(prisma.organization.update).not.toHaveBeenCalled();
    });
});
