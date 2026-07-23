/**
 * domain/billing/gateway/index.ts
 *
 * Provider registry — the single place that maps a provider identifier to its
 * adapter. Adding a provider means adding an adapter + one entry here; nothing
 * else in the app changes (Open/Closed).
 */

import { BillingError } from "../errors";
import { stripeGateway } from "./stripe.adapter";
import { razorpayGateway } from "./razorpay.adapter";
import type { PaymentGateway, PaymentProvider } from "./types";

const gateways: Record<PaymentProvider, PaymentGateway> = {
    stripe: stripeGateway,
    razorpay: razorpayGateway,
};

export function getPaymentGateway(provider: PaymentProvider): PaymentGateway {
    const gateway = gateways[provider];
    if (!gateway) {
        throw new BillingError(400, `Unsupported payment provider: ${provider}`);
    }
    return gateway;
}

export type { PaymentGateway, PaymentProvider } from "./types";
