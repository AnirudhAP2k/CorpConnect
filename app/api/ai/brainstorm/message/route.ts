/**
 * app/api/ai/brainstorm/message/route.ts
 *
 * Thin proxy — receives client-side chat message, forwards to Python AI service,
 * returns reply. The master JWT is minted server-side so the key never touches the browser.
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
    const { sessionId, organizationId, message } = body as {
        sessionId: string;
        organizationId: string;
        message: string;
    };

    if (!organizationId || !message) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Enterprise gate — re-verify on every request
    const gate = await checkEnterprise(organizationId);
    if (!gate.ok) {
        return NextResponse.json({ error: "Enterprise subscription required" }, { status: 403 });
    }

    const result = await aiService.chatBrainstorm({
        sessionId: sessionId || "new",
        userId: session.user.id,
        organizationId,
        message,
    });

    if (!result) {
        return NextResponse.json(
            { error: "AI service is temporarily unavailable. Please try again." },
            { status: 502 }
        );
    }

    return NextResponse.json(result);
}
