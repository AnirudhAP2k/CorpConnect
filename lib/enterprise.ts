/**
 * lib/enterprise.ts
 *
 * Phase 15 — Enterprise Vertical Hardening
 *
 * Centralised server-side enterprise gate utility.
 * Use this inside Server Components, Server Actions, and API route handlers.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  WHY NOT middleware?                                                    │
 * │  The Next.js middleware runs on the Edge runtime which cannot make      │
 * │  direct Prisma / DB calls. Enterprise plan checks require a DB lookup  │
 * │  against the Organization.subscriptionPlan field, so they must be      │
 * │  performed in Server Components or Server Actions (Node.js runtime).   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Usage patterns:
 *
 *   // 1. In a Server Component — redirect non-enterprise users:
 *   await requireEnterprise(orgId, { redirectTo: "/organizations/upgrade" });
 *
 *   // 2. In a Server Action — return an error result:
 *   const check = await checkEnterprise(orgId);
 *   if (!check.ok) return { error: check.reason };
 *
 *   // 3. Boolean check only:
 *   const isEnterprise = await isEnterpriseOrg(orgId);
 */

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnterpriseCheckResult {
    /** true when the organisation has an active ENTERPRISE subscription */
    ok: boolean;
    /** Human-readable reason when ok === false */
    reason?: string;
}

export interface RequireEnterpriseOptions {
    /**
     * Path to redirect to when the org is not on an Enterprise plan.
     * Defaults to "/pricing" if not provided.
     */
    redirectTo?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Lightweight boolean helper — does NOT redirect or throw.
 * Use when you only need to conditionally render a section.
 */
export async function isEnterpriseOrg(orgId: string): Promise<boolean> {
    if (!orgId) return false;
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { subscriptionPlan: true, subscriptionStatus: true },
    });
    return (
        org?.subscriptionPlan === "ENTERPRISE" &&
        (org?.subscriptionStatus === "ACTIVE" || org?.subscriptionStatus === "TRIALING")
    );
}

/**
 * Returns a structured result — use in Server Actions where redirecting
 * is not appropriate and the caller needs to handle the error state.
 */
export async function checkEnterprise(orgId: string): Promise<EnterpriseCheckResult> {
    const ok = await isEnterpriseOrg(orgId);
    if (!ok) {
        return {
            ok: false,
            reason:
                "This feature is only available to organizations on an Enterprise subscription plan. " +
                "Upgrade to unlock access.",
        };
    }
    return { ok: true };
}

/**
 * Hard gate — redirects immediately when the org is not on an Enterprise plan.
 *
 * Use at the top of Server Component page functions that should be completely
 * inaccessible to non-enterprise users.
 *
 * @param orgId     The organization ID to check
 * @param options   Optional { redirectTo } override (defaults to "/pricing")
 *
 * @example
 * // In app/(protected)/organizations/[id]/ai-planner/page.tsx:
 * await requireEnterprise(params.orgId, { redirectTo: `/organizations/${params.orgId}` });
 */
export async function requireEnterprise(
    orgId: string,
    options: RequireEnterpriseOptions = {},
): Promise<void> {
    const { redirectTo = "/pricing" } = options;
    const ok = await isEnterpriseOrg(orgId);
    if (!ok) {
        redirect(redirectTo);
    }
}
