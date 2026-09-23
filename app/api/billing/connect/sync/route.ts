/**
 * POST /api/billing/connect/sync
 *
 * Re-reads the Express account from Stripe after onboarding return.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { BillingError, syncStripeConnectAccount } from "@/domain/billing";

export const POST = async (req: NextRequest) => {
    try {
        const authUser = getApiAuth(req);
        if (!authUser?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const status = await syncStripeConnectAccount(authUser.id);
        return NextResponse.json(status, { status: 200 });
    } catch (error: unknown) {
        if (error instanceof BillingError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("[billing/connect/sync]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
