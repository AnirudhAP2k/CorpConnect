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
import type { JsonValue } from "@prisma/client/runtime/library";

export interface N8nJobPayload {
    ruleId: string;
    trigger: AutomationTriggerType;
    orgId: string;
    contextData: Record<string, any>;
    promptTemplate?: string | null;
}

// ─── filterJson matching ──────────────────────────────────────────────────────

type FilterOperator = "eq" | "gt" | "gte" | "lt" | "lte";
type FilterCondition = { [op in FilterOperator]?: JsonValue } | JsonValue;
type FilterJson = Record<string, FilterCondition>;

/**
 * Evaluate whether `contextData` satisfies the rule's `filterJson`.
 *
 * Supported filter shapes:
 *   - Equality:    `{ "contextData.rating": 5 }`
 *   - Operators:   `{ "contextData.rating": { "gte": 4 } }`
 *   - Multi-key:   all keys must match (AND logic)
 *
 * Unrecognised operators or missing keys cause the rule to be skipped (safe default).
 */
function matchesFilter(
    filterJson: JsonValue | null | undefined,
    contextData: Record<string, any>,
): boolean {
    if (!filterJson || typeof filterJson !== "object" || Array.isArray(filterJson)) return true;

    const filter = filterJson as FilterJson;

    for (const [rawKey, condition] of Object.entries(filter)) {
        // Strip "contextData." prefix if present for convenience
        const key = rawKey.startsWith("contextData.") ? rawKey.slice("contextData.".length) : rawKey;
        const actual = contextData[key];

        if (condition === null || condition === undefined) continue;

        // Simple equality: { "key": value }
        if (typeof condition !== "object" || Array.isArray(condition)) {
            if (actual !== condition) return false;
            continue;
        }

        // Operator object: { "gte": 4 }
        const ops = condition as Record<string, JsonValue>;
        for (const [op, expected] of Object.entries(ops)) {
            if (expected === null || expected === undefined) continue;
            const numActual = Number(actual);
            const numExpected = Number(expected);
            if (Number.isNaN(numActual) || Number.isNaN(numExpected)) return false;

            switch (op) {
                case "eq":  if (numActual !== numExpected) return false; break;
                case "gt":  if (numActual <= numExpected)  return false; break;
                case "gte": if (numActual < numExpected)   return false; break;
                case "lt":  if (numActual >= numExpected)  return false; break;
                case "lte": if (numActual > numExpected)   return false; break;
                default:    return false; // Unknown operator → skip rule (safe)
            }
        }
    }

    return true;
}

// ─── Enqueue ──────────────────────────────────────────────────────────────────

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
            select: { id: true, filterJson: true, promptTemplate: true },
        });

        if (rules.length === 0) return;

        // Apply filterJson matching — skip rules that don't match contextData
        const matchingRules = rules.filter(r => matchesFilter(r.filterJson, contextData));

        if (matchingRules.length === 0) {
            console.log(
                `[Automation] ⏭ ${rules.length} rule(s) found but none matched filterJson for trigger=${trigger} org=${orgId.slice(0, 8)}`
            );
            return;
        }

        await prisma.jobQueue.createMany({
            data: matchingRules.map(r => ({
                type: "TRIGGER_N8N_WORKFLOW" as const,
                payload: {
                    ruleId: r.id,
                    trigger,
                    orgId,
                    contextData,
                    ...(r.promptTemplate ? { promptTemplate: r.promptTemplate } : {}),
                } satisfies N8nJobPayload,
            })),
        });

        console.log(
            `[Automation] ⚡ Enqueued ${matchingRules.length} job(s) for trigger=${trigger} org=${orgId.slice(0, 8)}` +
            (matchingRules.length < rules.length ? ` (${rules.length - matchingRules.length} skipped by filter)` : "")
        );
    } catch (err) {
        console.error("[Automation] Failed to enqueue matching rules:", err);
    }
}
