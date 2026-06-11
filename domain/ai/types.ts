/**
 * domain/ai/types.ts
 *
 * Types for the AI domain — quota checks, feature identification, and result shapes.
 */

import type { SubscriptionPlan } from "@prisma/client";

// ─── Quota ────────────────────────────────────────────────────────────────────

export interface AiQuotaCheckResult {
    /** Whether the org is allowed to consume this AI feature. */
    allowed: boolean;
    /** Human-readable reason when allowed === false. */
    reason?: string;
    /** Credits remaining after this request (if allowed). */
    remaining?: number;
    /** Current usage count. */
    used?: number;
    /** Max usage limit for the current plan. */
    limit?: number;
}

/**
 * All tenant-facing AI features that are subject to quota gating.
 * System-internal features (embed, sentiment analysis, report generation)
 * are NOT listed here — they use the master JWT without metering.
 */
export type AiFeatureType =
    | "recommendEvents"
    | "recommendOrgs"
    | "search"
    | "generateDescription"
    | "matchmakingReason"
    | "chat"
    | "chatHistory"
    | "chatBrainstorm"
    | "chatBrainstormBrief";

// ─── Plan hierarchy ───────────────────────────────────────────────────────────

export const PLAN_RANK: Record<SubscriptionPlan, number> = {
    FREE: 0,
    PRO: 1,
    ENTERPRISE: 2,
};
