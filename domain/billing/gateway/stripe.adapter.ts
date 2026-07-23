/**
 * domain/billing/gateway/stripe.adapter.ts
 *
 * Stripe implementation of the PaymentGateway port. All Stripe SDK usage and
 * event-shape knowledge is contained here.
 */

import { prisma } from "@/lib/db";
import { getStripe, STRIPE_PRICE_IDS } from "@/lib/payment/stripe";
import { BillingError, WebhookVerificationError } from "../errors";
import type {
    BillingOrg,
    NormalizedBillingEvent,
    PaymentGateway,
    PortalSession,
    SubscriptionCheckout,
    BillingPlan,
} from "./types";

function periodDate(unixSeconds: number | undefined, fallbackMs: number): Date {
    return unixSeconds ? new Date(unixSeconds * 1000) : new Date(fallbackMs);
}

export const stripeGateway: PaymentGateway = {
    provider: "stripe",

    async ensureCustomer(org: BillingOrg): Promise<string> {
        if (org.stripeCustomerId) return org.stripeCustomerId;

        const stripe = getStripe();
        const customer = await stripe.customers.create({
            name: org.name,
            metadata: { orgId: org.id },
        });
        await prisma.organization.update({
            where: { id: org.id },
            data: { stripeCustomerId: customer.id },
        });
        return customer.id;
    },

    async createSubscriptionCheckout({ org, plan, appUrl }): Promise<SubscriptionCheckout> {
        const stripe = getStripe();
        const priceId = STRIPE_PRICE_IDS[plan];
        if (!priceId) {
            throw new BillingError(500, `Stripe Price ID for ${plan} is not configured`);
        }

        const customerId = await this.ensureCustomer(org);

        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${appUrl}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/billing?cancelled=1`,
            metadata: { orgId: org.id, plan },
        });

        return { url: checkoutSession.url ?? "" };
    },

    async createPortalSession(org: BillingOrg, appUrl: string): Promise<PortalSession> {
        if (!org.stripeCustomerId) {
            throw new BillingError(400, "No Stripe subscription found. Please subscribe first.");
        }
        const stripe = getStripe();
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: org.stripeCustomerId,
            return_url: `${appUrl}/billing`,
        });
        return { url: portalSession.url };
    },

    async verifyWebhook(rawBody: string, signature: string): Promise<NormalizedBillingEvent[]> {
        const stripe = getStripe();
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new WebhookVerificationError("Stripe webhook secret not configured");
        }

        let event: ReturnType<typeof stripe.webhooks.constructEvent>;
        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } catch (err) {
            throw new WebhookVerificationError(
                `Invalid Stripe signature: ${(err as Error).message}`
            );
        }

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as any;
                const orgId = session.metadata?.orgId as string | undefined;
                const plan = session.metadata?.plan as BillingPlan | undefined;
                const subscriptionId = session.subscription as string | undefined;
                if (!orgId || !plan || !subscriptionId) return [{ kind: "ignored" }];

                const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as any;
                return [
                    {
                        kind: "subscription.activated",
                        provider: "stripe",
                        orgId,
                        plan,
                        providerSubscriptionId: subscriptionId,
                        currentPeriodStart: periodDate(sub.current_period_start, Date.now()),
                        currentPeriodEnd: periodDate(
                            sub.current_period_end,
                            Date.now() + 30 * 24 * 60 * 60 * 1000
                        ),
                    },
                ];
            }

            case "invoice.payment_succeeded": {
                const invoice = event.data.object as any;
                const subscriptionId = invoice.subscription as string | undefined;
                if (!subscriptionId) return [{ kind: "ignored" }];

                const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as any;
                return [
                    {
                        kind: "subscription.renewed",
                        providerSubscriptionId: subscriptionId,
                        currentPeriodStart: periodDate(sub.current_period_start, Date.now()),
                        currentPeriodEnd: periodDate(
                            sub.current_period_end,
                            Date.now() + 30 * 24 * 60 * 60 * 1000
                        ),
                    },
                ];
            }

            case "invoice.payment_failed": {
                const invoice = event.data.object as any;
                const subscriptionId = invoice.subscription as string | undefined;
                if (!subscriptionId) return [{ kind: "ignored" }];
                return [{ kind: "subscription.payment_failed", providerSubscriptionId: subscriptionId }];
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as any;
                return [{ kind: "subscription.cancelled", providerSubscriptionId: subscription.id }];
            }

            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object as any;
                const participationId = paymentIntent.metadata?.participationId as string | undefined;
                if (!participationId) return [{ kind: "ignored" }];
                return [
                    {
                        kind: "event_payment.succeeded",
                        participationId,
                        findBy: { participationId },
                        receiptUrl: paymentIntent.charges?.data?.[0]?.receipt_url ?? null,
                        attachOrgApiKey: true,
                        markSucceededIfMissing: true,
                    },
                ];
            }

            default:
                return [{ kind: "ignored" }];
        }
    },
};
