import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai-service";

/**
 * GET /api/ai/recommend?type=events|orgs
 *
 * Session-authenticated proxy to the AI service.
 * - type=events → recommendations for the current user
 * - type=orgs   → recommendations for the user's active org
 */
export const GET = async (req: NextRequest) => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as "events" | "orgs" | null;
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);

    if (type === "events") {
        const recommendations = await aiService.recommendEvents(session.user.id, limit);
        return NextResponse.json({ recommendations, source: "ai" });
    }

    if (type === "orgs") {
        // activeOrganizationId is not in the JWT session — read from DB
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { activeOrganizationId: true },
        });
        const activeOrgId = user?.activeOrganizationId;
        if (!activeOrgId) {
            return NextResponse.json({ recommendations: [] });
        }
        const recommendations = await aiService.recommendOrgs(activeOrgId, limit);
        return NextResponse.json({ recommendations });
    }

    return NextResponse.json({ error: "type must be 'events' or 'orgs'" }, { status: 400 });
};
