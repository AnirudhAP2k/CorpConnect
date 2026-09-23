/**
 * POST /api/billing/connect/dashboard
 *
 * Express dashboard login link. Requires completed onboarding.
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { BillingError, createStripeConnectDashboardLink } from "@/domain/billing";

export const POST = async (req: NextRequest) => {
    try {
        const authUser = getApiAuth(req);
        if (!authUser?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const link = await createStripeConnectDashboardLink(authUser.id);
        return NextResponse.json(link, { status: 200 });
    } catch (error: unknown) {
        if (error instanceof BillingError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("[billing/connect/dashboard]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
