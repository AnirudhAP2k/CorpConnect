/**
 * POST /api/billing/connect/onboard
 *
 * Creates (if needed) a Stripe Express connected account and returns an
 * Account Link URL for KYC. OWNER/ADMIN only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { BillingError, createStripeConnectOnboardingLink } from "@/domain/billing";
import { readIdempotencyKeyHeader } from "@/lib/payment/idempotency";

export const POST = async (req: NextRequest) => {
    try {
        const authUser = getApiAuth(req);
        if (!authUser?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const link = await createStripeConnectOnboardingLink(
            authUser.id,
            readIdempotencyKeyHeader(req.headers),
        );
        return NextResponse.json(link, { status: 200 });
    } catch (error: unknown) {
        if (error instanceof BillingError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("[billing/connect/onboard]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
