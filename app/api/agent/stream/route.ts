import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getAgentCapabilities, checkAiQuota, deductAiUsage } from "@/domain/ai";
import { getMasterJwt } from "@/lib/ai-service";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const AI_SERVICE_MASTER_KEY = process.env.AI_SERVICE_MASTER_KEY ?? "";

/**
 * Next.js API Route for Streaming AI Agent Responses (SSE).
 *
 * Proxies the SSE stream from Python ai-service /agent/stream to the browser
 * token-by-token in real time.
 */
export async function POST(req: NextRequest) {
    // ── 1. Auth check ────────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const userId = session.user.id;
    const orgId = session.user.activeOrganizationId;

    if (!orgId) {
        return NextResponse.json({ error: "Active organization required." }, { status: 400 });
    }

    let body: { message?: string; sessionId?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { message, sessionId = "new" } = body;
    if (!message) {
        return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // ── 2. Member & Plan check ───────────────────────────────────────────────
    const [member, org] = await Promise.all([
        prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId, organizationId: orgId } },
            select: { role: true },
        }),
        prisma.organization.findUnique({
            where: { id: orgId },
            select: { name: true, subscriptionPlan: true },
        }),
    ]);

    if (!member || !org) {
        return NextResponse.json({ error: "Organization membership not found." }, { status: 403 });
    }

    const capabilities = getAgentCapabilities(member.role, org.subscriptionPlan);
    if (capabilities.length === 0) {
        return NextResponse.json(
            { error: "The AI Agent requires a PRO or ENTERPRISE plan." },
            { status: 403 }
        );
    }

    // ── 3. Quota check ───────────────────────────────────────────────────────
    const quota = await checkAiQuota(orgId, "agent");
    if (!quota.allowed) {
        return NextResponse.json({ error: quota.reason }, { status: 429 });
    }

    // Deduct AI usage
    await deductAiUsage(orgId);

    // ── 4. Proxy SSE stream from ai-service ──────────────────────────────────
    try {
        const masterToken = await getMasterJwt();
        const aiResp = await fetch(`${AI_SERVICE_URL}/agent/stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${masterToken}`,
            },
            body: JSON.stringify({
                sessionId,
                userId,
                orgId,
                message,
                capabilities,
                userName: session.user.name || "User",
                orgName: org.name,
                orgPlan: org.subscriptionPlan,
                userRole: member.role,
            }),
        });

        if (!aiResp.ok || !aiResp.body) {
            const errText = await aiResp.text().catch(() => "");
            console.error(`AI service stream failed (HTTP ${aiResp.status}):`, errText);
            return NextResponse.json(
                { error: errText ? JSON.parse(errText).detail || errText : `AI service returned HTTP ${aiResp.status}` },
                { status: aiResp.status }
            );
        }

        return new Response(aiResp.body, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (err: unknown) {
        console.error("AI Stream connection error:", err);
        const msg = err instanceof Error ? err.message : "Could not connect to AI service.";
        return NextResponse.json(
            { error: `AI service unavailable: ${msg}` },
            { status: 503 }
        );
    }
}
