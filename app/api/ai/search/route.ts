import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai-service";
import { checkAiQuota, deductAiUsage } from "@/domain/ai";
import { getApiAuth } from "@/lib/api-auth";

/**
 * POST /api/ai/search
 * Body: { query: string, limit?: number }
 *
 * Session-authenticated proxy to the AI semantic search endpoint.
 * Quota-gated: checks the user's active org's subscription plan and usage.
 * Falls back to empty results if AI service unavailable.
 */
export const POST = async (req: NextRequest) => {
    const authUser = getApiAuth(req);
    if (!authUser?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve the user's active org for quota gating
    const user = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { activeOrganizationId: true },
    });
    if (!user?.activeOrganizationId) {
        return NextResponse.json({ error: "No active organization. Join or create one first." }, { status: 403 });
    }

    // Quota gate
    const quota = await checkAiQuota(user.activeOrganizationId, "search");
    if (!quota.allowed) {
        return NextResponse.json({ error: quota.reason }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const query = (body.query as string)?.trim();
    const limit = parseInt(body.limit ?? "10", 10);

    if (!query || query.length < 2) {
        return NextResponse.json({ error: "query must be at least 2 characters" }, { status: 400 });
    }

    try {
        const results = await aiService.semanticSearch(query, limit);

        // Deduct after successful AI call
        await deductAiUsage(user.activeOrganizationId);

        return NextResponse.json({ query, results, count: results.length, remaining: (quota.remaining ?? 1) - 1 });
    } catch (error: any) {
        console.error("[POST /api/ai/search] AI service error:", error);
        return NextResponse.json(
            { error: "AI service is temporarily unavailable or returned an error." },
            { status: 502 }
        );
    }
};
