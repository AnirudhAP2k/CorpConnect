/**
 * lib/payment/razorpay.ts
 *
 * Lazy-initialised Razorpay client + helpers.
 */

import Razorpay from "razorpay";
import { razorpayIdempotencyHeaders } from "@/lib/payment/idempotency";

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

type RazorpayAxios = {
    post: (
        url: string,
        data: unknown,
        config?: { headers?: Record<string, string> }
    ) => Promise<{ data: unknown }>;
};

/**
 * razorpay@2.9.8 `create(params, callback)` cannot take request options, and
 * constructor headers filter out `X-Razorpay-Idempotency`. Post through the
 * SDK axios client so the header is actually sent.
 */
export async function razorpayIdempotentPost<T>(
    path: "/customers" | "/subscriptions" | "/orders",
    data: Record<string, unknown>,
    idempotencyKey: string
): Promise<T> {
    const client = getRazorpay() as unknown as { api: { rq: RazorpayAxios } };
    try {
        const response = await client.api.rq.post(
            `/v1${path}`,
            data,
            razorpayIdempotencyHeaders(idempotencyKey)
        );
        return response.data as T;
    } catch (err: unknown) {
        const axiosErr = err as { response?: { status: number; data?: { error?: unknown } } };
        if (axiosErr.response?.data?.error) {
            throw { statusCode: axiosErr.response.status, error: axiosErr.response.data.error };
        }
        throw err;
    }
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
