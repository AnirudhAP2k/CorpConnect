/**
 * app/api/ai/brainstorm/brief/route.ts
 *
 * Thin proxy — receives a sessionId, forwards to Python /chat/brainstorm/brief,
 * and returns the structured EventBrief to the client.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { aiService } from "@/lib/ai-service";
import { checkEnterprise } from "@/lib/enterprise";

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

    // Enterprise gate
    const gate = await checkEnterprise(organizationId);
    if (!gate.ok) {
        return NextResponse.json({ error: "Enterprise subscription required" }, { status: 403 });
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

    return NextResponse.json(result);
}
