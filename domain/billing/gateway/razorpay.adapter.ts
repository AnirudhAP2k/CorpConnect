/**
 * domain/billing/gateway/razorpay.adapter.ts
 *
 * Razorpay implementation of the PaymentGateway port. All Razorpay SDK usage,
 * HMAC verification, and event-shape knowledge is contained here.
 */

import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { getRazorpay, RAZORPAY_PRICE_IDS } from "@/lib/payment/razorpay";
import { hashMessage } from "@/lib/hash";
import { BillingError, WebhookVerificationError } from "../errors";
import type { Subscriptions } from "razorpay/dist/types/subscriptions";
import type {
    BillingOrg,
    NormalizedBillingEvent,
    PaymentGateway,
    PortalSession,
    SubscriptionCheckout,
    BillingPlan,
} from "./types";

function verifyRzpSignature(body: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
    // Fail closed: without a configured secret we cannot trust any request.
    if (!secret) return false;

    const expected = hashMessage(body, secret);
    const expectedBuf = Buffer.from(expected, "hex");
    const signatureBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== signatureBuf.length) return false;
    return timingSafeEqual(expectedBuf, signatureBuf);
}

export const razorpayGateway: PaymentGateway = {
    provider: "razorpay",

    async ensureCustomer(org: BillingOrg): Promise<string> {
        if (org.razorpayCustomerId) return org.razorpayCustomerId;

        const razorpay = getRazorpay();
        const customer = await razorpay.customers.create({
            name: org.name,
            notes: { orgId: org.id },
        });
        await prisma.organization.update({
            where: { id: org.id },
            data: { razorpayCustomerId: customer.id },
        });
        return customer.id;
    },

    async createSubscriptionCheckout({ org, plan }): Promise<SubscriptionCheckout> {
        const razorpay = getRazorpay();
        const rzpPlanId = RAZORPAY_PRICE_IDS[plan];
        if (!rzpPlanId) {
            throw new BillingError(500, `Razorpay Plan ID for ${plan} is not configured`);
        }

        // Ensure the customer record exists/persisted (mirrors prior behavior).
        await this.ensureCustomer(org);

        const subscription = await (razorpay.subscriptions.create({
            plan_id: rzpPlanId,
            customer_notify: 1,
            total_count: 120,
            notes: { orgId: org.id, plan },
        }) as Promise<Subscriptions.RazorpaySubscription>);

        const url = subscription.short_url;
        if (!url) {
            throw new Error("Razorpay did not return a short_url for the subscription");
        }
        return { url, subscriptionId: subscription.id };
    },

    async createPortalSession(): Promise<PortalSession> {
        // Razorpay has no hosted customer portal equivalent.
        throw new BillingError(400, "Self-serve billing portal is not available for Razorpay.");
    },

    async verifyWebhook(rawBody: string, signature: string): Promise<NormalizedBillingEvent[]> {
        if (!verifyRzpSignature(rawBody, signature)) {
            throw new WebhookVerificationError("Invalid Razorpay signature");
        }

        let event: { event: string; payload: any };
        try {
            event = JSON.parse(rawBody);
        } catch {
            throw new WebhookVerificationError("Invalid Razorpay webhook JSON");
        }

        switch (event.event) {
            case "subscription.activated": {
                const rzpSub = event.payload.subscription?.entity;
                const orgId = rzpSub?.notes?.orgId as string | undefined;
                const plan = rzpSub?.notes?.plan as BillingPlan | undefined;
                if (!orgId || !plan || !rzpSub?.id) return [{ kind: "ignored" }];

                return [
                    {
                        kind: "subscription.activated",
                        provider: "razorpay",
                        orgId,
                        plan,
                        providerSubscriptionId: rzpSub.id,
                        currentPeriodStart: new Date(rzpSub.current_start * 1000),
                        currentPeriodEnd: new Date(rzpSub.current_end * 1000),
                    },
                ];
            }

            case "subscription.cancelled": {
                const rzpSub = event.payload.subscription?.entity;
                if (!rzpSub?.id) return [{ kind: "ignored" }];
                return [{ kind: "subscription.cancelled", providerSubscriptionId: rzpSub.id }];
            }

            case "payment.captured": {
                const rzpPayment = event.payload.payment?.entity;
                const participationId = rzpPayment?.notes?.participationId as string | undefined;
                const orderId = rzpPayment?.order_id as string | undefined;
                if (!rzpPayment?.id || !participationId || !orderId) return [{ kind: "ignored" }];

                return [
                    {
                        kind: "event_payment.succeeded",
                        participationId,
                        findBy: { providerPaymentId: orderId },
                        updateProviderPaymentId: rzpPayment.id,
                        attachOrgApiKey: false,
                        markSucceededIfMissing: false,
                    },
                ];
            }

            default:
                return [{ kind: "ignored" }];
        }
    },
};
