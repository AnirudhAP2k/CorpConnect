/**
 * lib/jobs/automation.ts
 *
 * Fire-and-forget helper: looks up all ACTIVE AutomationRules for a given
 * organisation + trigger type, and enqueues one TRIGGER_N8N_WORKFLOW job per
 * matching rule.  Called from API routes / server actions at every trigger point.
 *
 * Usage:
 *   import { enqueueMatchingRules } from "@/lib/jobs/automation";
 *   await enqueueMatchingRules("EVENT_REGISTRATION", orgId, { eventId, userId });
 */

import { prisma } from "@/lib/db";
import { AutomationTriggerType } from "@/lib/types";

export interface N8nJobPayload {
    ruleId: string;
    trigger: AutomationTriggerType;
    orgId: string;
    contextData: Record<string, any>;
}

/**
 * Find all ACTIVE rules for this org + trigger and enqueue one job each.
 * Non-blocking — always resolves; failures are logged but never surfaced to callers.
 */
export async function enqueueMatchingRules(
    trigger: AutomationTriggerType,
    orgId: string,
    contextData: Record<string, any>,
): Promise<void> {
    try {
        const rules = await prisma.automationRule.findMany({
            where: { organizationId: orgId, trigger, status: "ACTIVE" },
            select: { id: true },
        });

        if (rules.length === 0) return;

        await prisma.jobQueue.createMany({
            data: rules.map(r => ({
                type: "TRIGGER_N8N_WORKFLOW" as const,
                payload: { ruleId: r.id, trigger, orgId, contextData } satisfies N8nJobPayload,
            })),
        });

        console.log(
            `[Automation] ⚡ Enqueued ${rules.length} job(s) for trigger=${trigger} org=${orgId.slice(0, 8)}`
        );
    } catch (err) {
        console.error("[Automation] Failed to enqueue matching rules:", err);
    }
}
