/**
 * Tests for the payment gateway port:
 *  - domain/billing/gateway (registry / provider selection)
 *  - Stripe adapter webhook verification + normalization
 *  - Razorpay adapter webhook verification (real HMAC) + normalization
 */

import { getPaymentGateway } from "@/domain/billing/gateway";
import { stripeGateway } from "@/domain/billing/gateway/stripe.adapter";
import { razorpayGateway } from "@/domain/billing/gateway/razorpay.adapter";
import { BillingError, WebhookVerificationError } from "@/domain/billing/errors";
import { getStripe } from "@/lib/payment/stripe";
import { hashMessage } from "@/lib/hash";

jest.mock("@/lib/db", () => ({
    prisma: { organization: { update: jest.fn() } },
}));

jest.mock("@/lib/payment/stripe", () => ({
    getStripe: jest.fn(),
    STRIPE_PRICE_IDS: { PRO: "price_pro", ENTERPRISE: "price_ent" },
}));

jest.mock("@/lib/payment/razorpay", () => ({
    getRazorpay: jest.fn(),
    RAZORPAY_PRICE_IDS: { PRO: "plan_pro", ENTERPRISE: "plan_ent" },
    PLATFORM_FEE_PERCENT: { PRO: 0.02, ENTERPRISE: 0.01 },
}));

const ORG_ID = "22222222-2222-4222-8222-222222222222";

describe("Payment gateway registry", () => {
    it("returns the Stripe adapter for 'stripe'", () => {
        expect(getPaymentGateway("stripe").provider).toBe("stripe");
    });

    it("returns the Razorpay adapter for 'razorpay'", () => {
        expect(getPaymentGateway("razorpay").provider).toBe("razorpay");
    });

    it("throws a 400 BillingError for unsupported providers", () => {
        expect(() => getPaymentGateway("paypal" as never)).toThrow(BillingError);
        try {
            getPaymentGateway("paypal" as never);
        } catch (err) {
            expect((err as BillingError).status).toBe(400);
        }
    });
});

describe("Stripe adapter", () => {
    const ORIGINAL_ENV = process.env;
    let constructEvent: jest.Mock;
    let retrieveSubscription: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...ORIGINAL_ENV, STRIPE_WEBHOOK_SECRET: "whsec_test" };
        constructEvent = jest.fn();
        retrieveSubscription = jest.fn();
        (getStripe as jest.Mock).mockReturnValue({
            webhooks: { constructEvent },
            subscriptions: { retrieve: retrieveSubscription },
        });
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    it("fails closed when the webhook secret is not configured", async () => {
        delete process.env.STRIPE_WEBHOOK_SECRET;

        await expect(stripeGateway.verifyWebhook("{}", "sig")).rejects.toBeInstanceOf(
            WebhookVerificationError
        );
        expect(constructEvent).not.toHaveBeenCalled();
    });

    it("rejects payloads with an invalid signature", async () => {
        constructEvent.mockImplementation(() => {
            throw new Error("No signatures found");
        });

        await expect(stripeGateway.verifyWebhook("{}", "bad-sig")).rejects.toBeInstanceOf(
            WebhookVerificationError
        );
    });

    it("normalizes checkout.session.completed into subscription.activated", async () => {
        constructEvent.mockReturnValue({
            type: "checkout.session.completed",
            data: {
                object: {
                    metadata: { orgId: ORG_ID, plan: "PRO" },
                    subscription: "sub_stripe_1",
                },
            },
        });
        retrieveSubscription.mockResolvedValue({
            current_period_start: 1780000000,
            current_period_end: 1782600000,
        });

        const events = await stripeGateway.verifyWebhook("raw", "sig");

        expect(events).toEqual([
            {
                kind: "subscription.activated",
                provider: "stripe",
                orgId: ORG_ID,
                plan: "PRO",
                providerSubscriptionId: "sub_stripe_1",
                currentPeriodStart: new Date(1780000000 * 1000),
                currentPeriodEnd: new Date(1782600000 * 1000),
            },
        ]);
    });

    it("ignores checkout sessions without org metadata", async () => {
        constructEvent.mockReturnValue({
            type: "checkout.session.completed",
            data: { object: { metadata: {}, subscription: "sub_stripe_1" } },
        });

        const events = await stripeGateway.verifyWebhook("raw", "sig");

        expect(events).toEqual([{ kind: "ignored" }]);
        expect(retrieveSubscription).not.toHaveBeenCalled();
    });

    it("normalizes invoice.payment_failed", async () => {
        constructEvent.mockReturnValue({
            type: "invoice.payment_failed",
            data: { object: { subscription: "sub_stripe_1" } },
        });

        const events = await stripeGateway.verifyWebhook("raw", "sig");

        expect(events).toEqual([
            { kind: "subscription.payment_failed", providerSubscriptionId: "sub_stripe_1" },
        ]);
    });

    it("normalizes customer.subscription.deleted", async () => {
        constructEvent.mockReturnValue({
            type: "customer.subscription.deleted",
            data: { object: { id: "sub_stripe_1" } },
        });

        const events = await stripeGateway.verifyWebhook("raw", "sig");

        expect(events).toEqual([
            { kind: "subscription.cancelled", providerSubscriptionId: "sub_stripe_1" },
        ]);
    });

    it("normalizes payment_intent.succeeded into an event payment", async () => {
        constructEvent.mockReturnValue({
            type: "payment_intent.succeeded",
            data: {
                object: {
                    metadata: { participationId: "part-1" },
                    charges: { data: [{ receipt_url: "https://stripe.com/r/1" }] },
                },
            },
        });

        const events = await stripeGateway.verifyWebhook("raw", "sig");

        expect(events).toEqual([
            {
                kind: "event_payment.succeeded",
                participationId: "part-1",
                findBy: { participationId: "part-1" },
                receiptUrl: "https://stripe.com/r/1",
                attachOrgApiKey: true,
                markSucceededIfMissing: true,
            },
        ]);
    });

    it("ignores unrecognized event types", async () => {
        constructEvent.mockReturnValue({ type: "charge.refunded", data: { object: {} } });

        const events = await stripeGateway.verifyWebhook("raw", "sig");

        expect(events).toEqual([{ kind: "ignored" }]);
    });

    it("createPortalSession requires an existing Stripe customer", async () => {
        await expect(
            stripeGateway.createPortalSession(
                { id: ORG_ID, name: "Acme", stripeCustomerId: null, razorpayCustomerId: null },
                "http://localhost:3000"
            )
        ).rejects.toMatchObject({ status: 400 });
    });
});

describe("Razorpay adapter", () => {
    const ORIGINAL_ENV = process.env;
    const SECRET = "rzp_test_webhook_secret";

    const sign = (body: string) => hashMessage(body, SECRET);

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...ORIGINAL_ENV, RAZORPAY_WEBHOOK_SECRET: SECRET };
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    it("fails closed when the webhook secret is not configured", async () => {
        delete process.env.RAZORPAY_WEBHOOK_SECRET;
        const body = JSON.stringify({ event: "subscription.activated", payload: {} });

        await expect(razorpayGateway.verifyWebhook(body, sign(body))).rejects.toBeInstanceOf(
            WebhookVerificationError
        );
    });

    it("rejects a tampered payload (signature no longer matches)", async () => {
        const body = JSON.stringify({ event: "subscription.activated", payload: {} });
        const signature = sign(body);
        const tampered = body.replace("activated", "cancelled");

        await expect(razorpayGateway.verifyWebhook(tampered, signature)).rejects.toBeInstanceOf(
            WebhookVerificationError
        );
    });

    it("rejects signatures of a different length without throwing internally", async () => {
        const body = JSON.stringify({ event: "subscription.activated", payload: {} });

        await expect(razorpayGateway.verifyWebhook(body, "abcd")).rejects.toBeInstanceOf(
            WebhookVerificationError
        );
    });

    it("normalizes subscription.activated with a genuine HMAC signature", async () => {
        const body = JSON.stringify({
            event: "subscription.activated",
            payload: {
                subscription: {
                    entity: {
                        id: "sub_rzp_1",
                        notes: { orgId: ORG_ID, plan: "ENTERPRISE" },
                        current_start: 1780000000,
                        current_end: 1782600000,
                    },
                },
            },
        });

        const events = await razorpayGateway.verifyWebhook(body, sign(body));

        expect(events).toEqual([
            {
                kind: "subscription.activated",
                provider: "razorpay",
                orgId: ORG_ID,
                plan: "ENTERPRISE",
                providerSubscriptionId: "sub_rzp_1",
                currentPeriodStart: new Date(1780000000 * 1000),
                currentPeriodEnd: new Date(1782600000 * 1000),
            },
        ]);
    });

    it("ignores activation events missing org notes", async () => {
        const body = JSON.stringify({
            event: "subscription.activated",
            payload: { subscription: { entity: { id: "sub_rzp_1", notes: {} } } },
        });

        const events = await razorpayGateway.verifyWebhook(body, sign(body));

        expect(events).toEqual([{ kind: "ignored" }]);
    });

    it("normalizes subscription.cancelled", async () => {
        const body = JSON.stringify({
            event: "subscription.cancelled",
            payload: { subscription: { entity: { id: "sub_rzp_1" } } },
        });

        const events = await razorpayGateway.verifyWebhook(body, sign(body));

        expect(events).toEqual([
            { kind: "subscription.cancelled", providerSubscriptionId: "sub_rzp_1" },
        ]);
    });

    it("normalizes payment.captured into an event payment keyed by order id", async () => {
        const body = JSON.stringify({
            event: "payment.captured",
            payload: {
                payment: {
                    entity: {
                        id: "pay_rzp_1",
                        order_id: "order_rzp_1",
                        notes: { participationId: "part-1" },
                    },
                },
            },
        });

        const events = await razorpayGateway.verifyWebhook(body, sign(body));

        expect(events).toEqual([
            {
                kind: "event_payment.succeeded",
                participationId: "part-1",
                findBy: { providerPaymentId: "order_rzp_1" },
                updateProviderPaymentId: "pay_rzp_1",
                attachOrgApiKey: false,
                markSucceededIfMissing: false,
            },
        ]);
    });

    it("ignores unrecognized event types", async () => {
        const body = JSON.stringify({ event: "refund.processed", payload: {} });

        const events = await razorpayGateway.verifyWebhook(body, sign(body));

        expect(events).toEqual([{ kind: "ignored" }]);
    });

    it("createPortalSession is not supported for Razorpay", async () => {
        await expect(
            razorpayGateway.createPortalSession(
                { id: ORG_ID, name: "Acme", stripeCustomerId: null, razorpayCustomerId: null },
                "http://localhost:3000"
            )
        ).rejects.toMatchObject({ status: 400 });
    });
});
