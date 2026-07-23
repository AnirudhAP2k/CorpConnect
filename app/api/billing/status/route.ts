/**
 * app/api/billing/status/route.ts
 *
 * GET /api/billing/status
 *
 * Returns the current subscription state of the caller's active org.
 * Thin controller over the billing domain service.
 */

import { getApiAuth } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { getBillingStatus, BillingError } from "@/domain/billing";

export const GET = async (req: NextRequest) => {
    try {
        const authUser = getApiAuth(req);
        const userId = authUser?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const status = await getBillingStatus(userId);
        return NextResponse.json(status, { status: 200 });
    } catch (error: any) {
        if (error instanceof BillingError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("[billing/status]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
