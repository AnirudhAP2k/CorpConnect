/**
 * app/api/billing/portal/route.ts
 *
 * POST /api/billing/portal
 *
 * Creates a self-serve customer portal session so the org can manage its plan.
 * Thin controller over the billing domain service.
 *
 * Returns: { url: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiAuth } from "@/lib/api-auth";
import { createBillingPortal, BillingError } from "@/domain/billing";

export const POST = async (req: NextRequest) => {
    try {
        const authUser = getApiAuth(req);
        if (!authUser?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const portal = await createBillingPortal(authUser.id);
        return NextResponse.json(portal, { status: 200 });
    } catch (error: any) {
        if (error instanceof BillingError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("[billing/portal]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
