/**
 * lib/jobs/expire-trials.ts
 *
 * Nightly sweep that drops organizations off the free trial once it lapses.
 *
 * Implemented as an idempotent sweep rather than a per-org queued job on purpose:
 * a queued job scheduled 14 days out is lost if the queue is pruned or the row is
 * cancelled, whereas a sweep that re-queries "TRIALING and past expiry" always
 * catches up — including for downtime that spans the expiry date.
 *
 * Orgs that convert to a paid plan are moved to ACTIVE by the billing webhooks, so
 * they no longer match the TRIALING filter and are never touched here.
 */

import { prisma } from "@/lib/db";
import { createNotification } from "@/domain/notifications";
import { AI_PLAN_LIMITS } from "@/constants";

export interface ExpireTrialsResult {
    scanned: number;
    downgraded: number;
}

export async function expireTrials(): Promise<ExpireTrialsResult> {
    const now = new Date();

    const expired = await prisma.organization.findMany({
        where: {
            subscriptionStatus: "TRIALING",
            subscriptionExpiresAt: { not: null, lt: now },
        },
        select: {
            id: true,
            name: true,
            subscriptionPlan: true,
            members: {
                where: { role: "OWNER" },
                select: { userId: true },
            },
        },
    });

    if (expired.length === 0) {
        console.log("[ExpireTrials] No trials to expire.");
        return { scanned: 0, downgraded: 0 };
    }

    console.log(`[ExpireTrials] ${expired.length} trial(s) past expiry.`);

    let downgraded = 0;

    for (const org of expired) {
        try {
            await prisma.$transaction([
                prisma.organization.update({
                    where: { id: org.id },
                    data: {
                        subscriptionPlan: "FREE",
                        subscriptionStatus: "ACTIVE",
                        subscriptionExpiresAt: null,
                    },
                }),
                // The API credential carries its own tier and usage ceiling, and the
                // Python AI service authorises tenant keys against those columns. Left
                // untouched, an expired trial would keep its PRO quota there.
                prisma.apiCredential.updateMany({
                    where: { organizationId: org.id, status: "ACTIVE" },
                    data: {
                        tier: "FREE",
                        usageLimit: AI_PLAN_LIMITS.FREE ?? 0,
                    },
                }),
            ]);

            downgraded += 1;
            console.log(`[ExpireTrials] Downgraded "${org.name}" (${org.id}) to FREE.`);

            for (const member of org.members) {
                await createNotification({
                    type: "BILLING",
                    userId: member.userId,
                    title: "Your free trial has ended",
                    description:
                        `${org.name} has moved to the Free plan. Upgrade to restore AI features, ` +
                        `advanced matchmaking, and higher limits.`,
                    link: "/billing",
                });
            }
        } catch (err) {
            // Keep sweeping — one bad org should not block the rest, and the next
            // run will retry this one because it still matches the filter.
            console.error(`[ExpireTrials] Failed to downgrade ${org.id}:`, err);
        }
    }

    console.log(`[ExpireTrials] Done. ${downgraded}/${expired.length} downgraded.`);

    return { scanned: expired.length, downgraded };
}
