/**
 * lib/payment/razorpay.ts
 *
 * Lazy-initialised Razorpay client + helpers.
 */

import Razorpay from "razorpay";

let _razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
    if (!_razorpay) {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret)
            throw new Error("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set");
        _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return _razorpay;
}

/** Subscription plan → Razorpay Price ID mapping */
export const RAZORPAY_PRICE_IDS: Record<"PRO" | "ENTERPRISE", string> = {
    PRO: process.env.RAZORPAY_PRO_PLAN_ID ?? "",
    ENTERPRISE: process.env.RAZORPAY_ENTERPRISE_PLAN_ID ?? "",
};

/** Platform fee percentage by plan (bps format for Razorpay application_fee_amount calculation) */
export const PLATFORM_FEE_PERCENT: Record<"PRO" | "ENTERPRISE", number> = {
    PRO: 0.02,        // 2%
    ENTERPRISE: 0.01, // 1%
};
