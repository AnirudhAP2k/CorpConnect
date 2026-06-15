import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai-service";
import { checkAiQuota, deductAiUsage } from "@/domain/ai";
import { getApiAuth } from "@/lib/api-auth";

/**
 * GET /api/ai/recommend?type=events|orgs
 *
 * Session-authenticated proxy to the AI service.
 * Quota-gated: checks the user's active org's subscription plan and usage.
 *
 * - type=events → recommendations for the current user
 * - type=orgs   → recommendations for the user's active org
 */
export const GET = async (req: NextRequest) => {
    const authUser = getApiAuth(req);
    if (!authUser?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as "events" | "orgs" | null;
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);

    // Resolve active org for quota gating
    const user = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { activeOrganizationId: true },
    });
    const activeOrgId = user?.activeOrganizationId;

    if (!activeOrgId) {
        return NextResponse.json({ error: "No active organization." }, { status: 403 });
    }

    if (type === "events") {
        // Quota gate
        const quota = await checkAiQuota(activeOrgId, "recommendEvents");
        if (!quota.allowed) {
            return NextResponse.json({ error: quota.reason }, { status: 403 });
        }

        try {
            const recommendations = await aiService.recommendEvents(authUser.id, limit);
            await deductAiUsage(activeOrgId);
            return NextResponse.json({ recommendations, source: "ai", remaining: (quota.remaining ?? 1) - 1 });
        } catch (error: any) {
            console.error("[GET /api/ai/recommend?type=events] AI error:", error);
            return NextResponse.json({ error: "AI service error. Try again later." }, { status: 502 });
        }
    }

    if (type === "orgs") {
        // Quota gate
        const quota = await checkAiQuota(activeOrgId, "recommendOrgs");
        if (!quota.allowed) {
            return NextResponse.json({ error: quota.reason }, { status: 403 });
        }

        try {
            const recommendations = await aiService.recommendOrgs(activeOrgId, limit);
            await deductAiUsage(activeOrgId);
            return NextResponse.json({ recommendations, remaining: (quota.remaining ?? 1) - 1 });
        } catch (error: any) {
            console.error("[GET /api/ai/recommend?type=orgs] AI error:", error);
            return NextResponse.json({ error: "AI service error. Try again later." }, { status: 502 });
        }
    }

    return NextResponse.json({ error: "type must be 'events' or 'orgs'" }, { status: 400 });
};
