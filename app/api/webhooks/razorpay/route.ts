/**
 * app/api/webhooks/razorpay/route.ts
 *
 * Razorpay webhook endpoint. Thin controller: verify HMAC + normalize via the
 * Razorpay gateway adapter, then dispatch each normalized event to the shared
 * billing processor. All Razorpay-specific logic lives in the adapter.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPaymentGateway, handleBillingEvent, WebhookVerificationError } from "@/domain/billing";

export const POST = async (req: NextRequest) => {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";
    const gateway = getPaymentGateway("razorpay");

    let events;
    try {
        events = await gateway.verifyWebhook(rawBody, signature);
    } catch (err) {
        if (err instanceof WebhookVerificationError) {
            console.error("[rzp-webhook]", err.message);
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }
        throw err;
    }

    try {
        for (const event of events) {
            await handleBillingEvent(event);
        }
    } catch (err: any) {
        console.error("[rzp-webhook] Error handling event:", err?.message ?? err);
        return NextResponse.json({ error: err?.message ?? "Handler error" }, { status: 500 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
};
