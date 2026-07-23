/**
 * app/api/billing/subscribe/route.ts
 *
 * POST /api/billing/subscribe
 * Body: { plan: "PRO" | "ENTERPRISE", provider: "stripe" | "razorpay" }
 *
 * Thin controller: authenticate, validate input, delegate to the billing
 * domain service (which selects the provider gateway), return the checkout URL.
 */

import { getApiAuth } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { paymentProviders, subscriptionPlans } from "@/constants";
import { createBillingCheckout, BillingError } from "@/domain/billing";
import type { BillingPlan, PaymentProvider } from "@/domain/billing";

export const POST = async (req: NextRequest) => {
    try {
        const authUser = getApiAuth(req);
        const userId = authUser?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { plan, provider } = body as { plan: BillingPlan; provider: PaymentProvider };

        if (!subscriptionPlans.includes(plan)) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }
        if (!paymentProviders.includes(provider)) {
            return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
        }

        const checkout = await createBillingCheckout({ userId, plan, provider });
        return NextResponse.json(checkout, { status: 200 });
    } catch (error: any) {
        if (error instanceof BillingError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        // Surface provider SDK error details (Razorpay / Stripe) for diagnostics.
        const razorpayMsg = error?.error?.description ?? error?.description ?? null;
        const stripeMsg = error?.raw?.message ?? null;
        const detail = razorpayMsg ?? stripeMsg ?? error?.message ?? "Unknown error";
        console.error("[billing/subscribe] Error:", detail, "\nFull error:", JSON.stringify(error, null, 2));
        return NextResponse.json(
            { error: "Subscription creation failed", detail },
            { status: 500 }
        );
    }
};
