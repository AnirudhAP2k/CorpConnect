/**
 * @jest-environment node
 *
 * Event ticket checkout: Stripe idempotencyKey and Razorpay receipt.
 */

import { AUTH_SESSION_HEADER } from "@/constants";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/payment/stripe";
import { razorpayIdempotentPost } from "@/lib/payment/razorpay";

jest.mock("@/lib/db", () => ({
    prisma: {
        events: { findUnique: jest.fn() },
        user: { findUnique: jest.fn() },
        eventParticipation: { findUnique: jest.fn(), create: jest.fn() },
        eventPayment: { upsert: jest.fn() },
    },
}));

jest.mock("@/lib/payment/stripe", () => ({
    getStripe: jest.fn(),
    PLATFORM_FEE_PERCENT: { PRO: 0.02, ENTERPRISE: 0.01 },
}));

jest.mock("@/lib/payment/razorpay", () => ({
    getRazorpay: jest.fn(),
    razorpayIdempotentPost: jest.fn(),
}));

const EVENT_ID = "44444444-4444-4444-8444-444444444444";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const PARTICIPATION_ID = "33333333-3333-4333-8333-333333333333";

function checkoutRequest(provider: "stripe" | "razorpay", idempotencyKey?: string) {
    const headers = new Headers({
        "content-type": "application/json",
        [AUTH_SESSION_HEADER]: JSON.stringify({ id: USER_ID }),
    });
    if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
    return new Request(`http://localhost/api/events/${EVENT_ID}/checkout`, {
        method: "POST",
        headers,
        body: JSON.stringify({ provider }),
    }) as unknown as import("next/server").NextRequest;
}

function mockPaidEvent() {
    (prisma.events.findUnique as jest.Mock).mockResolvedValue({
        id: EVENT_ID,
        title: "Paid Meetup",
        paymentMode: "PLATFORM",
        price: "29.99",
        currency: "INR",
        organization: { id: "org-1", name: "Acme", subscriptionPlan: "PRO", isVerified: true },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ activeOrganizationId: "org-1" });
    (prisma.eventParticipation.findUnique as jest.Mock).mockResolvedValue({ id: PARTICIPATION_ID });
    (prisma.eventPayment.upsert as jest.Mock).mockResolvedValue({});
}

describe("POST /api/events/[id]/checkout", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPaidEvent();
    });

    it("passes a deterministic Stripe idempotencyKey derived from participationId", async () => {
        const sessionsCreate = jest.fn().mockResolvedValue({
            id: "cs_test",
            url: "https://checkout.stripe.com/c/pay/cs",
            payment_intent: "pi_test",
        });
        (getStripe as jest.Mock).mockReturnValue({
            checkout: { sessions: { create: sessionsCreate } },
        });

        const { POST } = await import("@/app/api/events/[id]/checkout/route");
        const res = await POST(checkoutRequest("stripe"), { params: Promise.resolve({ id: EVENT_ID }) });

        expect(res.status).toBe(200);
        expect(sessionsCreate).toHaveBeenCalledWith(
            expect.objectContaining({ mode: "payment" }),
            { idempotencyKey: `evt:stripe:${PARTICIPATION_ID}` }
        );
    });

    it("uses the client Idempotency-Key on Stripe event checkout when present", async () => {
        const sessionsCreate = jest.fn().mockResolvedValue({
            id: "cs_test",
            url: "https://checkout.stripe.com/c/pay/cs",
            payment_intent: "pi_test",
        });
        (getStripe as jest.Mock).mockReturnValue({
            checkout: { sessions: { create: sessionsCreate } },
        });

        const { POST } = await import("@/app/api/events/[id]/checkout/route");
        await POST(checkoutRequest("stripe", "mobile-evt-key-1"), {
            params: Promise.resolve({ id: EVENT_ID }),
        });

        expect(sessionsCreate).toHaveBeenCalledWith(
            expect.objectContaining({ mode: "payment" }),
            { idempotencyKey: "mobile-evt-key-1" }
        );
    });

    it("sets Razorpay receipt to the participation id and sends the idempotency key", async () => {
        (razorpayIdempotentPost as jest.Mock).mockResolvedValue({ id: "order_rzp_1" });

        const { POST } = await import("@/app/api/events/[id]/checkout/route");
        const res = await POST(checkoutRequest("razorpay"), { params: Promise.resolve({ id: EVENT_ID }) });

        expect(res.status).toBe(200);
        expect(razorpayIdempotentPost).toHaveBeenCalledWith(
            "/orders",
            expect.objectContaining({ receipt: PARTICIPATION_ID }),
            PARTICIPATION_ID
        );
    });

    it("uses a hashed Razorpay receipt when the client Idempotency-Key exceeds 40 chars", async () => {
        (razorpayIdempotentPost as jest.Mock).mockResolvedValue({ id: "order_rzp_1" });

        const { POST } = await import("@/app/api/events/[id]/checkout/route");
        const longKey = "mobile-event-checkout-key-that-is-longer-than-forty";
        await POST(checkoutRequest("razorpay", longKey), { params: Promise.resolve({ id: EVENT_ID }) });

        const payload = (razorpayIdempotentPost as jest.Mock).mock.calls[0][1];
        expect(payload.receipt).toHaveLength(40);
        expect(payload.receipt).not.toBe(longKey);
        expect(razorpayIdempotentPost).toHaveBeenCalledWith("/orders", expect.any(Object), longKey);
    });
});
