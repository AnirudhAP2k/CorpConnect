/**
 * app/api/ai/brainstorm/message/route.ts
 *
 * Thin proxy — receives client-side chat message, forwards to Python AI service,
 * returns reply. The master JWT is minted server-side so the key never touches the browser.
 *
 * Quota-gated: requires ENTERPRISE plan and deducts usage on success.
 */

import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai-service";
import { checkAiQuota, deductAiUsage } from "@/domain/ai";
import { getApiAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
    const authUser = getApiAuth(req);
    if (!authUser?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, organizationId, message } = body as {
        sessionId: string;
        organizationId: string;
        message: string;
    };

    if (!organizationId || !message) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Quota gate — replaces checkEnterprise with plan + usage check
    const quota = await checkAiQuota(organizationId, "chatBrainstorm");
    if (!quota.allowed) {
        return NextResponse.json({ error: quota.reason }, { status: 403 });
    }

    const result = await aiService.chatBrainstorm({
        sessionId: sessionId || "new",
        userId: authUser.id,
        organizationId,
        message,
    });

    if (!result) {
        return NextResponse.json(
            { error: "AI service is temporarily unavailable. Please try again." },
            { status: 502 }
        );
    }

    // Deduct after successful AI call
    await deductAiUsage(organizationId);

    return NextResponse.json(result);
}
