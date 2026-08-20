/**
 * Tests for lib/payment/idempotency.ts
 */

import {
    paymentIdempotencyKey,
    razorpayIdempotencyHeaders,
    razorpayReceipt,
    readIdempotencyKeyHeader,
    resolveIdempotencyKey,
} from "@/lib/payment/idempotency";

describe("paymentIdempotencyKey", () => {
    it("joins parts with colons", () => {
        expect(paymentIdempotencyKey("cust", "stripe", "org-1")).toBe("cust:stripe:org-1");
        expect(paymentIdempotencyKey("sub", "razorpay", "org-1", "PRO")).toBe(
            "sub:razorpay:org-1:PRO"
        );
    });
});

describe("resolveIdempotencyKey", () => {
    it("uses a well-formed client key", () => {
        expect(resolveIdempotencyKey("mobile-pay-abc-123", "fallback")).toBe("mobile-pay-abc-123");
    });

    it("falls back when the client key is missing or invalid", () => {
        expect(resolveIdempotencyKey(undefined, "fb")).toBe("fb");
        expect(resolveIdempotencyKey("  ", "fb")).toBe("fb");
        expect(resolveIdempotencyKey("has space", "fb")).toBe("fb");
        expect(resolveIdempotencyKey("bad/slash", "fb")).toBe("fb");
    });
});

describe("razorpayReceipt", () => {
    it("returns keys of 40 characters or fewer unchanged", () => {
        const id = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
        expect(id).toHaveLength(36);
        expect(razorpayReceipt(id)).toBe(id);
    });

    it("hashes longer keys to 40 hex characters", () => {
        const hashed = razorpayReceipt("a".repeat(50));
        expect(hashed).toHaveLength(40);
        expect(hashed).toMatch(/^[0-9a-f]{40}$/);
    });
});

describe("razorpayIdempotencyHeaders", () => {
    it("builds the X-Razorpay-Idempotency request option", () => {
        expect(razorpayIdempotencyHeaders("cust:razorpay:org-1")).toEqual({
            headers: { "X-Razorpay-Idempotency": "cust:razorpay:org-1" },
        });
    });
});

describe("readIdempotencyKeyHeader", () => {
    it("reads Idempotency-Key", () => {
        const headers = new Headers({ "Idempotency-Key": "k1" });
        expect(readIdempotencyKeyHeader(headers)).toBe("k1");
    });
});
