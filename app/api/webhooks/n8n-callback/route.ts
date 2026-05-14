import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/webhooks/n8n-callback
 *
 * n8n can POST the outcome of a workflow execution back here so we can
 * update the AutomationRule with the final run status.
 *
 * Security: caller must supply X-Callback-Secret matching N8N_CALLBACK_SECRET.
 *
 * Body:
 *   { ruleId: string; status: "success" | "error"; executionId?: string; outputData?: unknown }
 */

const CALLBACK_SECRET = process.env.N8N_CALLBACK_SECRET ?? "";

export const POST = async (req: NextRequest) => {
    // ── Auth: validate secret header ──────────────────────────────────────────
    const secret = req.headers.get("x-callback-secret") ?? "";
    if (!CALLBACK_SECRET || secret !== CALLBACK_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: { ruleId?: string; status?: string; executionId?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { ruleId, status, executionId } = body;

    if (!ruleId || !status) {
        return NextResponse.json({ error: "ruleId and status are required" }, { status: 400 });
    }

    if (!["success", "error", "timeout"].includes(status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    // ── Update rule ───────────────────────────────────────────────────────────
    try {
        await prisma.automationRule.update({
            where: { id: ruleId },
            data: {
                lastRunAt: new Date(),
                lastRunStatus: status,
            },
        });
    } catch {
        // Rule may have been deleted since the job ran — non-fatal
        console.warn(`[n8n-callback] Rule ${ruleId} not found for execution ${executionId}`);
    }

    console.log(`[n8n-callback] Rule ${ruleId} → ${status} (exec: ${executionId ?? "n/a"})`);
    return NextResponse.json({ ok: true });
};
