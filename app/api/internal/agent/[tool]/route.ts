import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { executeAgentTool } from "@/domain/ai/tools";
import { AGENT_MIN_PLAN, getAgentCapabilities, isToolAuthorised } from "@/domain/ai/agent-capability";

const AI_SERVICE_MASTER_KEY = process.env.AI_SERVICE_MASTER_KEY;

/**
 * Internal API Route for AI Agent Tool Execution.
 *
 * Domain-Driven Design (DDD) Thin HTTP Wrapper:
 *   - Auth: Master JWT verification (service-to-service)
 *   - Tenant Membership: OrganizationMember role lookup
 *   - Capability: re-compute from DB plan + role (do not trust ai-service)
 *   - Domain Execution: Delegates to executeAgentTool() in domain/ai/tools
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ tool: string }> }
) {
    // ── 1. Master JWT Verification ──────────────────────────────────────────
    if (!AI_SERVICE_MASTER_KEY) {
        console.error("AI_SERVICE_MASTER_KEY is not configured");
        return NextResponse.json(
            { error: "Agent tool API is misconfigured" },
            { status: 503 }
        );
    }

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

    // ── 3. Org Membership + Plan Check ───────────────────────────────────────
    const [member, org] = await Promise.all([
        prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId, organizationId: orgId } },
            select: { role: true },
        }),
        prisma.organization.findUnique({
            where: { id: orgId },
            select: { subscriptionPlan: true },
        }),
    ]);

    if (!member || !org) {
        return NextResponse.json(
            { error: "User is not a member of the active organization" },
            { status: 403 }
        );
    }

    // ── 4. Server-side capability enforcement (ignore caller-supplied caps) ──
    const capabilities = getAgentCapabilities(member.role, org.subscriptionPlan);
    if (!isToolAuthorised(tool, capabilities)) {
        return NextResponse.json(
            {
                error:
                    `Forbidden: tool '${tool}' is not authorised for role=${member.role} ` +
                    `plan=${org.subscriptionPlan}.` +
                    ` Upgrade to at least ${AGENT_MIN_PLAN} plan to access AI agent features.`,
            },
            { status: 403 }
        );
    }

    // ── 5. Delegate to Domain Tool Execution ─────────────────────────────────
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
