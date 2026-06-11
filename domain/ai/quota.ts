/**
 * domain/ai/quota.ts
 *
 * Centralised AI quota enforcement.
 *
 * Checks the organisation's subscription plan and ApiCredential usage
 * before allowing tenant-facing AI calls. After a successful AI call,
 * atomically increments ApiCredential.usageCount so the same counter
 * is shared with the Python AI service's tenant-key auth path.
 *
 * System-internal calls (embed jobs, sentiment analysis, report generation)
 * bypass this gate entirely — they use the master JWT without metering.
 */

import { prisma } from "@/lib/db";
import { AI_PLAN_LIMITS, AI_FEATURE_MIN_PLAN } from "@/constants";
import type { SubscriptionPlan } from "@prisma/client";
import type { AiQuotaCheckResult, AiFeatureType } from "./types";
import { PLAN_RANK } from "./types";

// ─── Quota check ──────────────────────────────────────────────────────────────

/**
 * Verify that an organisation is allowed to consume a tenant-facing AI feature.
 *
 * Checks:
 *   1. Org exists and has an active/trialing subscription.
 *   2. Org's plan meets the minimum required for the feature.
 *   3. Usage count has not reached the plan limit.
 *
 * Does NOT deduct — call `deductAiUsage()` after the AI call succeeds.
 */
export async function checkAiQuota(
    orgId: string,
    feature: AiFeatureType,
): Promise<AiQuotaCheckResult> {
    // ── 1. Fetch org plan ────────────────────────────────────────────────────
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { subscriptionPlan: true, subscriptionStatus: true },
    });

    if (!org) {
        return { allowed: false, reason: "Organization not found." };
    }

    // ── 2. Subscription status gate ──────────────────────────────────────────
    if (!["ACTIVE", "TRIALING"].includes(org.subscriptionStatus)) {
        return {
            allowed: false,
            reason: "Your subscription is not active. Please update your billing to use AI features.",
        };
    }

    // ── 3. Plan tier gate ────────────────────────────────────────────────────
    const requiredPlan = (AI_FEATURE_MIN_PLAN[feature] ?? "PRO") as SubscriptionPlan;
    if (PLAN_RANK[org.subscriptionPlan] < PLAN_RANK[requiredPlan]) {
        return {
            allowed: false,
            reason: `This feature requires a ${requiredPlan} plan. Your current plan: ${org.subscriptionPlan}.`,
        };
    }

    // ── 4. Usage limit gate ──────────────────────────────────────────────────
    const planLimit = AI_PLAN_LIMITS[org.subscriptionPlan] ?? 0;

    // Get or auto-provision ApiCredential for usage tracking
    const credential = await getOrCreateCredential(orgId, org.subscriptionPlan);

    if (credential.usageCount >= planLimit) {
        return {
            allowed: false,
            reason: `AI usage limit reached (${credential.usageCount}/${planLimit}). Resets on plan renewal or upgrade your plan.`,
            used: credential.usageCount,
            limit: planLimit,
            remaining: 0,
        };
    }

    return {
        allowed: true,
        used: credential.usageCount,
        limit: planLimit,
        remaining: planLimit - credential.usageCount,
    };
}

// ─── Usage deduction ──────────────────────────────────────────────────────────

/**
 * Atomically increment ApiCredential.usageCount after a successful AI call.
 * Uses Prisma's atomic `increment` to avoid race conditions.
 */
export async function deductAiUsage(orgId: string): Promise<void> {
    await prisma.apiCredential.update({
        where: { organizationId: orgId },
        data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
        },
    });
}

// ─── Credential provisioning ──────────────────────────────────────────────────

/**
 * Get the existing ApiCredential for an org, or auto-create a placeholder
 * so that usage tracking works even if the org never manually generated a key.
 *
 * The auto-provisioned credential has a dummy apiKey (unusable for direct API auth)
 * but allows the Next.js app to track AI usage against the same table.
 */
async function getOrCreateCredential(orgId: string, plan: SubscriptionPlan) {
    const existing = await prisma.apiCredential.findUnique({
        where: { organizationId: orgId },
        select: { usageCount: true, usageLimit: true, tier: true },
    });

    if (existing) return existing;

    // Auto-provision with a non-functional placeholder key.
    // The org can later generate a real key via the API credentials UI.
    const planLimit = AI_PLAN_LIMITS[plan] ?? 0;
    return prisma.apiCredential.create({
        data: {
            organizationId: orgId,
            apiKey: `__auto_provisioned_${orgId}`,
            apiKeyPrefix: "__auto__",
            tier: plan as "FREE" | "PRO" | "ENTERPRISE",
            usageLimit: planLimit,
            usageCount: 0,
        },
        select: { usageCount: true, usageLimit: true, tier: true },
    });
}

// ─── Read-only usage info ─────────────────────────────────────────────────────

/**
 * Returns the current AI usage stats for an org (for billing page / dashboard).
 */
export async function getAiUsageStats(orgId: string): Promise<{
    used: number;
    limit: number;
    plan: SubscriptionPlan;
}> {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { subscriptionPlan: true },
    });

    if (!org) return { used: 0, limit: 0, plan: "FREE" as SubscriptionPlan };

    const credential = await prisma.apiCredential.findUnique({
        where: { organizationId: orgId },
        select: { usageCount: true },
    });

    return {
        used: credential?.usageCount ?? 0,
        limit: AI_PLAN_LIMITS[org.subscriptionPlan] ?? 0,
        plan: org.subscriptionPlan,
    };
}
