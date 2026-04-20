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
