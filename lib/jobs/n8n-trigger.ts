/**
 * lib/jobs/n8n-trigger.ts
 *
 * Job handler for TRIGGER_N8N_WORKFLOW queue entries.
 * Called by the job processor with an N8nJobPayload.
 *
 * Flow:
 *   1. Fetch the AutomationRule (get webhookUrl, verify still ACTIVE)
 *   2. Build & sign HMAC-SHA256 over deterministic message string
 *   3. POST signed payload to the rule's n8n webhook URL
 *   4. Update AutomationRule run stats (runCount, lastRunAt, lastRunStatus)
 *   5. On failure re-throw so the job processor can retry
 */

import { prisma } from "@/lib/db";
import { createHmac } from "crypto";
import type { N8nJobPayload } from "@/lib/jobs/automation";

const N8N_SHARED_SECRET = process.env.N8N_SHARED_SECRET ?? "";
const WEBHOOK_TIMEOUT_MS = 10_000; // 10 s

// ─── HMAC signing ─────────────────────────────────────────────────────────────

function buildSignature(ruleId: string, trigger: string, orgId: string, timestamp: number): string {
    const message = `${ruleId}:${trigger}:${orgId}:${timestamp}`;
    return "sha256=" + createHmac("sha256", N8N_SHARED_SECRET).update(message).digest("hex");
}

// ─── Job handler ──────────────────────────────────────────────────────────────

export async function processN8nWorkflow(payload: N8nJobPayload): Promise<void> {
    const { ruleId, trigger, orgId, contextData } = payload;

    // 1. Fetch rule
    const rule = await prisma.automationRule.findUnique({
        where: { id: ruleId },
        select: { id: true, webhookUrl: true, status: true, runCount: true },
    });

    if (!rule) {
        throw new Error(`[n8n] AutomationRule ${ruleId} not found.`);
    }
    if (rule.status !== "ACTIVE") {
        console.log(`[n8n] Rule ${ruleId} is ${rule.status} — skipping.`);
        return;
    }

    // 2. Sign the request
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = buildSignature(ruleId, trigger, orgId, timestamp);

    const requestBody = {
        ruleId,
        trigger,
        orgId,
        contextData,
        timestamp,
    };

    // 3. POST to n8n webhook
    let lastRunStatus = "error";
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

        const res = await fetch(rule.webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Evently-Signature": signature,
                "X-Evently-Timestamp": String(timestamp),
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
            throw new Error(`[n8n] Webhook returned HTTP ${res.status} for rule ${ruleId}`);
        }

        lastRunStatus = "success";
        console.log(`[n8n] ✓ Triggered rule ${ruleId} (${trigger}) → ${res.status}`);
    } catch (err: any) {
        lastRunStatus = err?.name === "AbortError" ? "timeout" : "error";
        // Update stats before re-throwing for the retry mechanism
        await prisma.automationRule.update({
            where: { id: ruleId },
            data: {
                runCount: { increment: 1 },
                lastRunAt: new Date(),
                lastRunStatus,
            },
        });
        throw err;   // re-throw → job processor marks job as FAILED/retry
    }

    // 4. Update stats on success
    await prisma.automationRule.update({
        where: { id: ruleId },
        data: {
            runCount: { increment: 1 },
            lastRunAt: new Date(),
            lastRunStatus: "success",
        },
    });
}
