/**
 * @jest-environment node
 *
 * POST /api/billing/subscribe accepts a mobile Idempotency-Key header.
 */

import { AUTH_SESSION_HEADER } from "@/constants";
import { createBillingCheckout } from "@/domain/billing";

jest.mock("@/domain/billing", () => {
    class BillingError extends Error {
        status: number;
        constructor(status: number, message: string) {
            super(message);
            this.status = status;
        }
    }
    return {
        createBillingCheckout: jest.fn(),
        BillingError,
    };
});

function subscribeRequest(idempotencyKey?: string) {
    const headers = new Headers({
        "content-type": "application/json",
        [AUTH_SESSION_HEADER]: JSON.stringify({ id: "11111111-1111-4111-8111-111111111111" }),
    });
    if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
    return new Request("http://localhost/api/billing/subscribe", {
        method: "POST",
        headers,
        body: JSON.stringify({ plan: "PRO", provider: "stripe" }),
    }) as unknown as import("next/server").NextRequest;
}

describe("POST /api/billing/subscribe", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (createBillingCheckout as jest.Mock).mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/cs" });
    });

    it("forwards Idempotency-Key to createBillingCheckout", async () => {
        const { POST } = await import("@/app/api/billing/subscribe/route");
        const res = await POST(subscribeRequest("mobile-sub-key-1"));

        expect(res.status).toBe(200);
        expect(createBillingCheckout).toHaveBeenCalledWith({
            userId: "11111111-1111-4111-8111-111111111111",
            plan: "PRO",
            provider: "stripe",
            idempotencyKey: "mobile-sub-key-1",
        });
    });

    it("omits the key when the header is absent", async () => {
        const { POST } = await import("@/app/api/billing/subscribe/route");
        await POST(subscribeRequest());

        expect(createBillingCheckout).toHaveBeenCalledWith({
            userId: "11111111-1111-4111-8111-111111111111",
            plan: "PRO",
            provider: "stripe",
            idempotencyKey: undefined,
        });
    });
});
