import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { executeAgentTool } from "@/domain/ai/tools";

const AI_SERVICE_MASTER_KEY = process.env.AI_SERVICE_MASTER_KEY;

/**
 * Internal API Route for AI Agent Tool Execution.
 *
 * Domain-Driven Design (DDD) Thin HTTP Wrapper:
 *   - Auth: Master JWT verification (service-to-service)
 *   - Tenant Membership: OrganizationMember role lookup
 *   - Domain Execution: Delegates to executeAgentTool() in domain/ai/tools
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ tool: string }> }
) {
    // ── 1. Master JWT Verification ──────────────────────────────────────────
    const token = req.headers.get("x-agent-token");

    if (!token) {
        return NextResponse.json({ error: "Unauthorized: Missing agent token" }, { status: 401 });
    }

    try {
        const secret = new TextEncoder().encode(AI_SERVICE_MASTER_KEY);
        await jwtVerify(token, secret);
    } catch (err: unknown) {
        console.error("Agent JWT Verification Failed:", err);
        return NextResponse.json(
            { error: `Unauthorized: ${err instanceof Error ? err.message : "Invalid agent token"}` },
            { status: 403 }
        );
    }

    // ── 2. Parse Body ───────────────────────────────────────────────────────
    const { tool } = await params;
    let body: { userId?: string; orgId?: string; toolArgs?: Record<string, unknown> };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { userId, orgId, toolArgs = {} } = body;

    if (!userId || !orgId) {
        return NextResponse.json({ error: "Missing userId or orgId in request body" }, { status: 400 });
    }

    // ── 3. Org Membership Check ──────────────────────────────────────────────
    const member = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        select: { role: true },
    });

    if (!member) {
        return NextResponse.json({ error: "User is not a member of the active organization" }, { status: 403 });
    }

    // ── 4. Delegate to Domain Tool Execution ─────────────────────────────────
    try {
        const result = await executeAgentTool(tool, {
            userId,
            orgId,
            role: member.role,
            toolArgs,
        });
        return NextResponse.json(result);
    } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Internal tool execution error";
        const isForbidden = errorMsg.startsWith("Forbidden");
        return NextResponse.json({ error: errorMsg }, { status: isForbidden ? 403 : 400 });
    }
}
