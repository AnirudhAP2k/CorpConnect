/**
 * lib/payment/stripe.ts
 *
 * Lazy-initialised Stripe client + helpers.
 * Import `stripe` from this module wherever you need the SDK.
 */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
        _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
    }
    return _stripe;
}

/** Subscription plan → Stripe Price ID mapping */
export const STRIPE_PRICE_IDS: Record<"PRO" | "ENTERPRISE", string> = {
    PRO: process.env.STRIPE_PRO_PRICE_ID ?? "",
    ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
};

/** Platform fee percentage by plan (bps format for Stripe application_fee_amount calculation) */
export const PLATFORM_FEE_PERCENT: Record<"PRO" | "ENTERPRISE", number> = {
    PRO: 0.02,        // 2%
    ENTERPRISE: 0.01, // 1%
};
