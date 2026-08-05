/**
 * lib/jobs/n8n-trigger.ts
 *
 * Job handler for TRIGGER_N8N_WORKFLOW queue entries.
 * Called by the job processor with an N8nJobPayload.
 *
 * Flow:
 *   1. Fetch the AutomationRule (+ optional template)
 *   2. Resolve webhook URL: template.webhookUrl if templateId set, else rule.webhookUrl
 *   3. Resolve prompt: job payload → rule.promptTemplate → template.defaultPromptTemplate
 *   4. Build & sign HMAC-SHA256 over deterministic message string
 *   5. POST signed payload to the resolved n8n webhook URL
 *   6. Update AutomationRule run stats (runCount, lastRunAt, lastRunStatus)
 *   7. On failure re-throw so the job processor can retry
 */

import { prisma } from "@/lib/db";
import { hashMessage } from "@/lib/hash";
import type { N8nJobPayload } from "@/lib/jobs/automation";

const N8N_SHARED_SECRET = process.env.N8N_SHARED_SECRET ?? "";
const WEBHOOK_TIMEOUT_MS = 10_000; // 10 s

// ─── HMAC signing ─────────────────────────────────────────────────────────────

function buildSignature(ruleId: string, trigger: string, orgId: string, timestamp: number): string {
    const message = `${ruleId}:${trigger}:${orgId}:${timestamp}`;
    return "sha256=" + hashMessage(message, N8N_SHARED_SECRET);
}

// ─── Job handler ──────────────────────────────────────────────────────────────

export async function processN8nWorkflow(payload: N8nJobPayload): Promise<void> {
    const { ruleId, trigger, orgId, contextData, promptTemplate } = payload;

    // 1. Fetch rule + template (URL/prompt may live on the platform catalog)
    const rule = await prisma.automationRule.findUnique({
        where: { id: ruleId },
        select: {
            id: true,
            webhookUrl: true,
            status: true,
            runCount: true,
            promptTemplate: true,
            templateId: true,
            template: {
                select: {
                    webhookUrl: true,
                    defaultPromptTemplate: true,
                    isActive: true,
                },
            },
        },
    });

    if (!rule) {
        throw new Error(`[n8n] AutomationRule ${ruleId} not found.`);
    }
    if (rule.status !== "ACTIVE") {
        console.log(`[n8n] Rule ${ruleId} is ${rule.status} — skipping.`);
        return;
    }

    // 2. Resolve webhook URL (template preferred so admin can rotate centrally)
    let webhookUrl: string | null = null;
    if (rule.templateId && rule.template) {
        if (rule.template.isActive) {
            webhookUrl = rule.template.webhookUrl;
        } else if (rule.webhookUrl) {
            webhookUrl = rule.webhookUrl;
        } else {
            console.log(`[n8n] Rule ${ruleId} template is inactive and no fallback webhookUrl — skipping.`);
            return;
        }
    } else {
        webhookUrl = rule.webhookUrl;
    }

    if (!webhookUrl) {
        throw new Error(`[n8n] Rule ${ruleId} has no webhook URL (missing template or custom URL).`);
    }

    // 3. Sign the request
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = buildSignature(ruleId, trigger, orgId, timestamp);

    // 3b. Enforce HTTPS
    if (!webhookUrl.startsWith("https://")) {
        console.error(`[n8n] Rule ${ruleId} has non-HTTPS webhook URL — skipping for security.`);
        return;
    }

    // 3c. Build POST body — prompt: job → rule override → template default
    const resolvedPrompt =
        promptTemplate
        ?? rule.promptTemplate
        ?? rule.template?.defaultPromptTemplate
        ?? null;

    const requestBody = {
        ruleId,
        trigger,
        orgId,
        contextData,
        ...(resolvedPrompt ? { promptTemplate: resolvedPrompt } : {}),
        timestamp,
    };

    // 4. POST to n8n webhook
    let lastRunStatus = "error";
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CorpConnect-Signature": signature,
                "X-CorpConnect-Timestamp": String(timestamp),
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
            throw new Error(`[n8n] Webhook returned HTTP ${res.status} for rule ${ruleId}`);
        }

        lastRunStatus = "success";
        // Log hostname only — avoid leaking webhook paths with potential secrets
        const webhookHost = new URL(webhookUrl).hostname;
        console.log(`[n8n] ✓ Triggered rule ${ruleId} (${trigger}) → ${webhookHost} ${res.status}`);
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

    // 5. Update stats on success
    await prisma.automationRule.update({
        where: { id: ruleId },
        data: {
            runCount: { increment: 1 },
            lastRunAt: new Date(),
            lastRunStatus: "success",
        },
    });
}
