/**
 * Deterministic payment idempotency keys for Stripe / Razorpay.
 *
 * A new random UUID per click does not stop double-submit. Keys are derived
 * from the business operation, and a client Idempotency-Key (mobile) wins
 * when it is well-formed.
 */

import { createHash } from "node:crypto";

const CLIENT_KEY_RE = /^[A-Za-z0-9._:-]{1,255}$/;

export function paymentIdempotencyKey(...parts: string[]): string {
    return parts.join(":");
}

/** Prefer a well-formed client key; otherwise use the deterministic fallback. */
export function resolveIdempotencyKey(
    clientKey: string | null | undefined,
    fallback: string
): string {
    const trimmed = clientKey?.trim();
    if (trimmed && CLIENT_KEY_RE.test(trimmed)) return trimmed;
    return fallback;
}

/** Razorpay `receipt` is limited to 40 characters. */
export function razorpayReceipt(key: string): string {
    if (key.length <= 40) return key;
    return createHash("sha256").update(key).digest("hex").slice(0, 40);
}

export function razorpayIdempotencyHeaders(key: string): { headers: Record<string, string> } {
    return { headers: { "X-Razorpay-Idempotency": key } };
}

export function readIdempotencyKeyHeader(headers: Headers): string | undefined {
    return headers.get("Idempotency-Key") ?? headers.get("idempotency-key") ?? undefined;
}
