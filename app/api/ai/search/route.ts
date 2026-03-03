import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/lib/ai-service";

/**
 * POST /api/ai/search
 * Body: { query: string, limit?: number }
 *
 * Session-authenticated proxy to the AI semantic search endpoint.
 * Falls back to empty results if AI service unavailable.
 */
export const POST = async (req: NextRequest) => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const query = (body.query as string)?.trim();
    const limit = parseInt(body.limit ?? "10", 10);

    if (!query || query.length < 2) {
        return NextResponse.json({ error: "query must be at least 2 characters" }, { status: 400 });
    }

    const results = await aiService.semanticSearch(query, limit);
    return NextResponse.json({ query, results, count: results.length });
};
