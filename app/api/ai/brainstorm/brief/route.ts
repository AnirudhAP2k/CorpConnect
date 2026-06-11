/**
 * app/api/ai/brainstorm/brief/route.ts
 *
 * Thin proxy — receives a sessionId, forwards to Python /chat/brainstorm/brief,
 * and returns the structured EventBrief to the client.
 *
 * Quota-gated: requires ENTERPRISE plan and deducts usage on success.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { aiService } from "@/lib/ai-service";
import { checkAiQuota, deductAiUsage } from "@/domain/ai";

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, organizationId } = body as {
        sessionId: string;
        organizationId: string;
    };

    if (!sessionId || !organizationId) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Quota gate — replaces checkEnterprise with plan + usage check
    const quota = await checkAiQuota(organizationId, "chatBrainstormBrief");
    if (!quota.allowed) {
        return NextResponse.json({ error: quota.reason }, { status: 403 });
    }

    const result = await aiService.chatBrainstormBrief({
        sessionId,
        userId: session.user.id,
        organizationId,
    });

    if (!result) {
        return NextResponse.json(
            { error: "Failed to generate event brief. Please continue brainstorming and try again." },
            { status: 502 }
        );
    }

    // Deduct after successful AI call
    await deductAiUsage(organizationId);

    return NextResponse.json(result);
}
